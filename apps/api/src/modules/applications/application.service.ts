import { ApplicationStatus, ShiftStatus, ChargeStatus } from "@prisma/client"

const DEFAULT_REJECTION_MESSAGE =
  "Agradecemos seu interesse, mas o plantão foi preenchido por outro profissional."
import { prisma } from "../../prisma/client"
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  AppError,
} from "../../shared/errors/AppError"
import { paginate, paginationMeta } from "../../shared/helpers/pagination"
import { notify } from "../../shared/services/notification.service"
import { getPlatformFeeCents, createPaymentPreference } from "../../shared/services/payment.service"
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

    const professional = await prisma.professionalProfile.findUnique({
      where: { id: professionalId },
      select: { councilType: true },
    })
    if (!professional) throw new NotFoundError("Perfil profissional não encontrado")
    if (professional.councilType !== shift.requiredCouncilType) {
      const label = shift.requiredCouncilType === "CRM" ? "médicos (CRM)" : "enfermeiros (COREN)"
      throw new ForbiddenError(`Esta vaga é exclusiva para ${label}`)
    }

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
          include: { hospital: { select: { userId: true, defaultRejectionMessage: true } } },
        },
        professional: { select: { userId: true } },
      },
    })

    if (!application) throw new NotFoundError("Candidatura não encontrada")

    if (application.shift.hospital.userId !== hospitalUserId) {
      throw new ForbiddenError("Sem permissão para atualizar esta candidatura")
    }

    if (
      application.status !== ApplicationStatus.PENDING &&
      application.status !== ApplicationStatus.PENDING_CONFIRMATION
    ) {
      throw new AppError(
        "Apenas candidaturas pendentes podem ter o status alterado",
        422,
        "UNPROCESSABLE"
      )
    }

    const newStatus = input.status as ApplicationStatus

    if (newStatus === ApplicationStatus.ACCEPTED) {
      if (application.status !== ApplicationStatus.PENDING) {
        throw new AppError(
          "Esta candidatura já foi aprovada e aguarda confirmação do profissional",
          422,
          "UNPROCESSABLE"
        )
      }

      const reservedCount = await prisma.application.count({
        where: {
          shiftId: application.shiftId,
          status: { in: [ApplicationStatus.PENDING_CONFIRMATION, ApplicationStatus.ACCEPTED] },
        },
      })
      if (reservedCount >= application.shift.slots) {
        throw new ConflictError(
          "Este plantão já está com todas as vagas reservadas ou preenchidas"
        )
      }

      // Aprovar a candidatura = aprovar o profissional como parte da equipe do hospital.
      // A vaga só é efetivamente preenchida quando o profissional confirmar e pagar a taxa.
      const updatedApplication = await prisma.$transaction(async (tx) => {
        const updated = await tx.application.update({
          where: { id },
          data: { status: ApplicationStatus.PENDING_CONFIRMATION },
        })

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
        type: "APPLICATION_PENDING_CONFIRMATION",
        title: "Você foi aprovado! Confirme sua vaga",
        message: `O hospital aprovou você para "${application.shift.title}". Confirme e pague a taxa de confirmação para garantir a vaga.`,
        link: `/profissional/candidaturas`,
      })

      return updatedApplication
    }

    const updatedApplication = await prisma.application.update({
      where: { id },
      data: {
        status: newStatus,
        rejectionReason:
          newStatus === ApplicationStatus.REJECTED
            ? application.shift.hospital.defaultRejectionMessage ?? undefined
            : undefined,
      },
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

  /**
   * Profissional confirma a vaga após ser aprovado pelo hospital. Gera (ou reaproveita)
   * uma cobrança e retorna o link de checkout do Mercado Pago. A candidatura só vira
   * ACCEPTED de fato quando o webhook de pagamento confirmar (ver finalizeConfirmedApplication).
   */
  static async confirmApplication(id: string, professionalUserId: string) {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        shift: { select: { id: true, title: true, hospitalId: true } },
        professional: { select: { id: true, userId: true } },
        charge: true,
      },
    })

    if (!application) throw new NotFoundError("Candidatura não encontrada")
    if (application.professional.userId !== professionalUserId) {
      throw new ForbiddenError("Sem permissão para confirmar esta candidatura")
    }
    if (application.status !== ApplicationStatus.PENDING_CONFIRMATION) {
      throw new AppError(
        "Esta candidatura não está aguardando confirmação",
        422,
        "UNPROCESSABLE"
      )
    }

    const professionalUser = await prisma.user.findUnique({
      where: { id: professionalUserId },
      select: { email: true },
    })
    if (!professionalUser) throw new NotFoundError("Usuário não encontrado")

    const amountCents = application.charge?.amountCents ?? getPlatformFeeCents()

    const charge = await prisma.charge.upsert({
      where: { applicationId: id },
      create: {
        applicationId: id,
        professionalId: application.professional.id,
        amountCents,
        status: ChargeStatus.PENDING,
      },
      update: { status: ChargeStatus.PENDING },
    })

    const { preferenceId, checkoutUrl } = await createPaymentPreference({
      chargeId: charge.id,
      amountCents: charge.amountCents,
      description: `Taxa de confirmação — ${application.shift.title}`,
      payerEmail: professionalUser.email,
    })

    await prisma.charge.update({
      where: { id: charge.id },
      data: { providerPreferenceId: preferenceId },
    })

    return { application, charge, checkoutUrl }
  }

  /**
   * Chamado pelo webhook do Mercado Pago quando um pagamento é aprovado.
   * Confirma a candidatura, preenche a vaga e rejeita as demais candidaturas
   * pendentes/reservadas se o plantão esgotar as vagas.
   */
  static async finalizeConfirmedApplication(chargeId: string, providerPaymentId: string) {
    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      include: {
        application: {
          include: {
            shift: { include: { hospital: { select: { userId: true, defaultRejectionMessage: true } } } },
          },
        },
      },
    })
    if (!charge) return null
    if (charge.status === ChargeStatus.PAID) return charge

    const application = charge.application

    const result = await prisma.$transaction(async (tx) => {
      await tx.charge.update({
        where: { id: charge.id },
        data: { status: ChargeStatus.PAID, paidAt: new Date(), providerPaymentId },
      })

      const updatedApplication = await tx.application.update({
        where: { id: application.id },
        data: { status: ApplicationStatus.ACCEPTED },
      })

      const updatedShift = await tx.shift.update({
        where: { id: application.shiftId },
        data: { filledSlots: { increment: 1 } },
      })

      let rejected: { professionalId: string; userId: string }[] = []

      if (updatedShift.filledSlots >= updatedShift.slots) {
        await tx.shift.update({
          where: { id: application.shiftId },
          data: { status: ShiftStatus.FILLED },
        })

        const stillReserved = await tx.application.findMany({
          where: {
            shiftId: application.shiftId,
            status: { in: [ApplicationStatus.PENDING, ApplicationStatus.PENDING_CONFIRMATION] },
            id: { not: application.id },
          },
          include: { professional: { select: { userId: true } } },
        })

        if (stillReserved.length > 0) {
          const rejectionReason =
            application.shift.hospital.defaultRejectionMessage ?? DEFAULT_REJECTION_MESSAGE

          await tx.application.updateMany({
            where: { id: { in: stillReserved.map((a) => a.id) } },
            data: { status: ApplicationStatus.REJECTED, rejectionReason },
          })

          rejected = stillReserved.map((a) => ({
            professionalId: a.professionalId,
            userId: a.professional.userId,
          }))
        }
      }

      return { updatedApplication, autoRejected: rejected, hospitalUserId: application.shift.hospital.userId }
    })

    await notify({
      userId: result.hospitalUserId,
      type: "APPLICATION_CONFIRMED",
      title: "Vaga confirmada",
      message: `O profissional confirmou e pagou a taxa para "${application.shift.title}"`,
      link: `/hospital/plantoes/${application.shiftId}`,
    })

    for (const rejectedApp of result.autoRejected) {
      await notify({
        userId: rejectedApp.userId,
        type: "APPLICATION_REJECTED",
        title: "Candidatura recusada",
        message: `Sua candidatura para "${application.shift.title}" foi recusada`,
        link: `/profissional/candidaturas`,
      })
    }

    return charge
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

    if (
      application.status !== ApplicationStatus.PENDING &&
      application.status !== ApplicationStatus.PENDING_CONFIRMATION
    ) {
      throw new AppError(
        "Apenas candidaturas pendentes podem ser canceladas",
        422,
        "UNPROCESSABLE"
      )
    }

    return prisma.$transaction(async (tx) => {
      await tx.charge.updateMany({
        where: { applicationId: id, status: ChargeStatus.PENDING },
        data: { status: ChargeStatus.CANCELLED },
      })

      return tx.application.update({
        where: { id },
        data: { status: ApplicationStatus.WITHDRAWN },
      })
    })
  }
}
