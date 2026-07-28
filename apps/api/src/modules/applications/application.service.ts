import { ApplicationStatus, ShiftStatus } from "@prisma/client"
import { prisma } from "../../prisma/client"
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  AppError,
} from "../../shared/errors/AppError"
import { paginate, paginationMeta } from "../../shared/helpers/pagination"
import { notify } from "../../shared/services/notification.service"
import type { CreateApplicationInput, UpdateStatusInput, ApplicationFilters } from "./application.dto"

export class ApplicationService {
  static async listShiftApplications(
    shiftId: string,
    requestingUserId: string,
    role: string
  ) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { hospital: { select: { userId: true } } },
    })
    if (!shift) throw new NotFoundError("Plantão não encontrado")

    if (role !== "ADMIN" && shift.hospital.userId !== requestingUserId) {
      throw new ForbiddenError("Sem permissão para ver candidaturas deste plantão")
    }

    return prisma.application.findMany({
      where: { shiftId },
      orderBy: { createdAt: "desc" },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            councilType: true,
            councilNumber: true,
            councilState: true,
            phone: true,
          },
        },
      },
    })
  }

  static async applyToShift(
    shiftId: string,
    professionalId: string,
    input: CreateApplicationInput
  ) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { hospital: { select: { userId: true } } },
    })
    if (!shift) throw new NotFoundError("Plantão não encontrado")

    if (shift.status === ShiftStatus.FILLED) {
      throw new ConflictError("Plantão já está preenchido")
    }
    if (shift.status === ShiftStatus.CANCELLED) {
      throw new ConflictError("Plantão está cancelado")
    }
    if (shift.status === ShiftStatus.COMPLETED) {
      throw new ConflictError("Plantão já foi concluído")
    }
    if (shift.status !== ShiftStatus.OPEN) {
      throw new ConflictError("Plantão não está disponível para candidaturas")
    }

    const existing = await prisma.application.findUnique({
      where: { shiftId_professionalId: { shiftId, professionalId } },
    })
    if (existing) throw new ConflictError("Você já se candidatou a este plantão")

    const application = await prisma.application.create({
      data: {
        shiftId,
        professionalId,
        message: input.message,
      },
      include: {
        shift: {
          select: { id: true, title: true, date: true, startTime: true, endTime: true },
        },
      },
    })

    await notify({
      userId: shift.hospital.userId,
      type: "NEW_APPLICATION",
      title: "Nova candidatura recebida",
      message: `Você recebeu uma nova candidatura para "${shift.title}"`,
      link: `/hospital/plantoes/${shiftId}`,
    })

    return application
  }

  static async listMyApplications(professionalId: string, filters: ApplicationFilters) {
    const { status, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const where: Record<string, unknown> = { professionalId }
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          shift: {
            include: {
              specialty: true,
              hospital: {
                select: { id: true, name: true, city: true, state: true },
              },
            },
          },
        },
      }),
      prisma.application.count({ where }),
    ])

    return { data, pagination: paginationMeta(total, page, limit) }
  }

  static async getApplication(id: string, requestingUserId: string, role: string) {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            hospital: { select: { id: true, name: true, userId: true } },
            specialty: true,
          },
        },
        professional: {
          select: { id: true, name: true, userId: true, councilType: true, councilNumber: true },
        },
      },
    })

    if (!application) throw new NotFoundError("Candidatura não encontrada")

    if (role === "ADMIN") return application

    const isHospitalOwner = application.shift.hospital.userId === requestingUserId
    const isProfessionalOwner = application.professional.userId === requestingUserId

    if (!isHospitalOwner && !isProfessionalOwner) {
      throw new ForbiddenError("Sem permissão para acessar esta candidatura")
    }

    return application
  }

  static async updateApplicationStatus(
    id: string,
    hospitalUserId: string,
    input: UpdateStatusInput
  ) {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        shift: {
          include: { hospital: { select: { userId: true } } },
        },
        professional: { select: { userId: true } },
      },
    })

    if (!application) throw new NotFoundError("Candidatura não encontrada")

    if (application.shift.hospital.userId !== hospitalUserId) {
      throw new ForbiddenError("Sem permissão para atualizar esta candidatura")
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new AppError(
        "Apenas candidaturas pendentes podem ter o status alterado",
        422,
        "UNPROCESSABLE"
      )
    }

    const newStatus = input.status as ApplicationStatus

    if (newStatus === ApplicationStatus.ACCEPTED) {
      const updatedApplication = await prisma.$transaction(async (tx) => {
        const updated = await tx.application.update({
          where: { id },
          data: { status: ApplicationStatus.ACCEPTED },
        })

        const updatedShift = await tx.shift.update({
          where: { id: application.shiftId },
          data: { filledSlots: { increment: 1 } },
        })

        if (updatedShift.filledSlots >= updatedShift.slots) {
          await tx.shift.update({
            where: { id: application.shiftId },
            data: { status: ShiftStatus.FILLED },
          })
        }

        await tx.hospitalStaff.upsert({
          where: {
            hospitalId_professionalId: {
              hospitalId: application.shift.hospitalId,
              professionalId: application.professionalId,
            },
          },
          create: {
            hospitalId: application.shift.hospitalId,
            professionalId: application.professionalId,
            status: "ACTIVE",
            type: "AVULSO",
            joinedAt: new Date(),
          },
          update: { status: "ACTIVE" },
        })

        return updated
      })

      await notify({
        userId: application.professional.userId,
        type: "APPLICATION_ACCEPTED",
        title: "Candidatura aceita",
        message: `Sua candidatura para "${application.shift.title}" foi aceita`,
        link: `/profissional/candidaturas`,
      })

      return updatedApplication
    }

    const updatedApplication = await prisma.application.update({
      where: { id },
      data: { status: newStatus },
    })

    if (newStatus === ApplicationStatus.REJECTED) {
      await notify({
        userId: application.professional.userId,
        type: "APPLICATION_REJECTED",
        title: "Candidatura recusada",
        message: `Sua candidatura para "${application.shift.title}" foi recusada`,
        link: `/profissional/candidaturas`,
      })
    }

    return updatedApplication
  }

  static async getMyStats(professionalId: string) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const applications = await prisma.application.findMany({
      where: {
        professionalId,
        status: ApplicationStatus.ACCEPTED,
        shift: { date: { gte: startOfMonth, lt: startOfNextMonth } },
      },
      include: {
        shift: { select: { startTime: true, endTime: true, compensationType: true } },
      },
    })

    let totalMinutes = 0
    const byCompensation = { MONEY: 0, HOUR_BANK: 0, OTHER: 0 }

    for (const app of applications) {
      const [sh, sm] = app.shift.startTime.split(":").map(Number)
      const [eh, em] = app.shift.endTime.split(":").map(Number)
      let minutes = eh * 60 + em - (sh * 60 + sm)
      if (minutes <= 0) minutes += 24 * 60
      totalMinutes += minutes
      byCompensation[app.shift.compensationType] += 1
    }

    return {
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      shiftsCount: applications.length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      byCompensation,
    }
  }

  static async withdrawApplication(id: string, professionalUserId: string) {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        professional: { select: { userId: true } },
      },
    })

    if (!application) throw new NotFoundError("Candidatura não encontrada")

    if (application.professional.userId !== professionalUserId) {
      throw new ForbiddenError("Sem permissão para cancelar esta candidatura")
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new AppError(
        "Apenas candidaturas pendentes podem ser canceladas",
        422,
        "UNPROCESSABLE"
      )
    }

    return prisma.application.update({
      where: { id },
      data: { status: ApplicationStatus.WITHDRAWN },
    })
  }
}
