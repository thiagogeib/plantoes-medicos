import { ShiftStatus, SwapRequestStatus, LeaveRequestStatus } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { NotFoundError, ForbiddenError, ConflictError, AppError } from "../../shared/errors/AppError"
import { paginate, paginationMeta } from "../../shared/helpers/pagination"
import type { CreateShiftInput, UpdateShiftInput, ShiftFilters } from "./shift.dto"
import { notifyProfessionalsAboutNewShift } from "../../shared/services/shift-notification.service"

const TURNO_RANGES: Record<string, { gte: string; lt: string }> = {
  MANHA: { gte: "00:00", lt: "12:00" },
  TARDE: { gte: "12:00", lt: "18:00" },
  NOITE: { gte: "18:00", lt: "24:00" },
}

export class ShiftService {
  static async listShifts(
    filters: ShiftFilters,
    requestingUserId?: string,
    role?: string
  ) {
    const { specialtyId, city, state, dateFrom, dateTo, status, compensationType, turno, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const where: Record<string, unknown> = {}

    if (role === "PROFESSIONAL") {
      where.status = status ?? ShiftStatus.OPEN

      const professional = requestingUserId
        ? await prisma.professionalProfile.findUnique({
            where: { userId: requestingUserId },
            select: { id: true },
          })
        : null

      const staffLinks = professional
        ? await prisma.hospitalStaff.findMany({
            where: { professionalId: professional.id, status: "ACTIVE" },
            select: { hospitalId: true },
          })
        : []

      where.hospitalId = { in: staffLinks.map((s) => s.hospitalId) }
    } else if (status) {
      where.status = status
    }

    if (specialtyId) where.specialtyId = specialtyId
    if (compensationType) where.compensationType = compensationType
    if (turno) where.startTime = TURNO_RANGES[turno]

    if (city || state) {
      where.hospital = {
        ...(city ? { city } : {}),
        ...(state ? { state } : {}),
      }
    }

    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      }
    } else if (role === "PROFESSIONAL") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      where.date = { gte: today }
    }

    const [data, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        skip,
        take,
        orderBy: { date: "asc" },
        include: {
          specialty: true,
          hospital: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
            },
          },
        },
      }),
      prisma.shift.count({ where }),
    ])

    return { data, pagination: paginationMeta(total, page, limit) }
  }

  static async createShift(hospitalId: string, input: CreateShiftInput) {
    const specialty = await prisma.specialty.findUnique({ where: { id: input.specialtyId } })
    if (!specialty) throw new NotFoundError("Especialidade não encontrada")

    if (input.coverageForAbsenceId) {
      const absence = await prisma.absence.findUnique({ where: { id: input.coverageForAbsenceId } })
      if (!absence) throw new NotFoundError("Afastamento não encontrado")
      if (absence.hospitalId !== hospitalId) throw new ForbiddenError("Afastamento não pertence a este hospital")
    }

    const shift = await prisma.shift.create({
      data: {
        hospitalId,
        specialtyId: input.specialtyId,
        title: input.title,
        description: input.description,
        date: new Date(input.date),
        startTime: input.startTime,
        endTime: input.endTime,
        location: input.location,
        slots: input.slots,
        compensationType: input.compensationType,
        compensationNote: input.compensationNote,
        coverageForAbsenceId: input.coverageForAbsenceId,
      },
      include: {
        specialty: true,
        hospital: {
          select: { id: true, name: true, city: true, state: true },
        },
        coverageForAbsence: {
          include: { professional: { select: { id: true, name: true } } },
        },
      },
    })

    // dispara notificações em background — não bloqueia a resposta
    void notifyProfessionalsAboutNewShift(shift)

    return shift
  }

  static async getShift(id: string, requestingUserId?: string, role?: string) {
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        specialty: true,
        hospital: {
          select: { id: true, name: true, city: true, state: true, phone: true },
        },
        coverageForAbsence: {
          include: { professional: { select: { id: true, name: true } } },
        },
      },
    })

    if (!shift) throw new NotFoundError("Plantão não encontrado")

    return shift
  }

  static async updateShift(id: string, hospitalId: string, input: UpdateShiftInput) {
    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift) throw new NotFoundError("Plantão não encontrado")
    if (shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão para editar este plantão")

    if (input.specialtyId) {
      const specialty = await prisma.specialty.findUnique({ where: { id: input.specialtyId } })
      if (!specialty) throw new NotFoundError("Especialidade não encontrada")
    }

    if (input.coverageForAbsenceId) {
      const absence = await prisma.absence.findUnique({ where: { id: input.coverageForAbsenceId } })
      if (!absence) throw new NotFoundError("Afastamento não encontrado")
      if (absence.hospitalId !== hospitalId) throw new ForbiddenError("Afastamento não pertence a este hospital")
    }

    if (input.status === ShiftStatus.CANCELLED && shift.status === ShiftStatus.FILLED) {
      throw new ConflictError("Não é possível cancelar um plantão já preenchido")
    }

    const updateData: Record<string, unknown> = {}
    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.specialtyId !== undefined) updateData.specialtyId = input.specialtyId
    if (input.date !== undefined) updateData.date = new Date(input.date)
    if (input.startTime !== undefined) updateData.startTime = input.startTime
    if (input.endTime !== undefined) updateData.endTime = input.endTime
    if (input.location !== undefined) updateData.location = input.location
    if (input.slots !== undefined) updateData.slots = input.slots
    if (input.status !== undefined) updateData.status = input.status
    if (input.compensationType !== undefined) updateData.compensationType = input.compensationType
    if (input.compensationNote !== undefined) updateData.compensationNote = input.compensationNote
    if (input.coverageForAbsenceId !== undefined) updateData.coverageForAbsenceId = input.coverageForAbsenceId

    const willCancel = input.status === ShiftStatus.CANCELLED && shift.status !== ShiftStatus.CANCELLED

    return prisma.$transaction(async (tx) => {
      const updatedShift = await tx.shift.update({
        where: { id },
        data: updateData,
        include: {
          specialty: true,
          hospital: {
            select: { id: true, name: true, city: true, state: true },
          },
          coverageForAbsence: {
            include: { professional: { select: { id: true, name: true } } },
          },
        },
      })

      if (willCancel) {
        await tx.shiftSwapRequest.updateMany({
          where: { shiftId: id, status: SwapRequestStatus.OPEN },
          data: { status: SwapRequestStatus.CANCELLED },
        })
        await tx.leaveRequest.updateMany({
          where: {
            shiftId: id,
            status: { in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED_PENDING_COVERAGE] },
          },
          data: { status: LeaveRequestStatus.CANCELLED },
        })
      }

      return updatedShift
    })
  }

  static async cancelShift(id: string, hospitalId: string) {
    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift) throw new NotFoundError("Plantão não encontrado")
    if (shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão para cancelar este plantão")
    if (shift.status === ShiftStatus.FILLED) throw new ConflictError("Não é possível cancelar um plantão já preenchido")
    if (shift.status === ShiftStatus.CANCELLED) throw new ConflictError("Plantão já está cancelado")

    return prisma.$transaction(async (tx) => {
      const updatedShift = await tx.shift.update({
        where: { id },
        data: { status: ShiftStatus.CANCELLED },
      })

      await tx.shiftSwapRequest.updateMany({
        where: { shiftId: id, status: SwapRequestStatus.OPEN },
        data: { status: SwapRequestStatus.CANCELLED },
      })

      await tx.leaveRequest.updateMany({
        where: {
          shiftId: id,
          status: { in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED_PENDING_COVERAGE] },
        },
        data: { status: LeaveRequestStatus.CANCELLED },
      })

      return updatedShift
    })
  }

  static async hardDeleteShift(id: string, hospitalId: string) {
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { applications: true },
    })
    if (!shift) throw new NotFoundError("Plantão não encontrado")
    if (shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão para excluir este plantão")

    const hasAccepted = shift.applications.some((a) => a.status === "ACCEPTED")
    if (hasAccepted) {
      throw new ConflictError(
        "Não é possível excluir um plantão com candidatura aceita — cancele-o em vez disso"
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.shiftSwapInterest.deleteMany({ where: { swapRequest: { shiftId: id } } })
      await tx.shiftSwapRequest.deleteMany({ where: { shiftId: id } })
      await tx.leaveCoverInterest.deleteMany({ where: { leaveRequest: { shiftId: id } } })
      await tx.leaveRequest.deleteMany({ where: { shiftId: id } })
      await tx.application.deleteMany({ where: { shiftId: id } })
      await tx.shift.delete({ where: { id } })
    })
  }

  static async listHospitalShifts(hospitalId: string, filters: ShiftFilters) {
    const { status, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const where: Record<string, unknown> = { hospitalId }
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        skip,
        take,
        orderBy: { date: "desc" },
        include: {
          specialty: true,
          _count: { select: { applications: true } },
        },
      }),
      prisma.shift.count({ where }),
    ])

    return { data, pagination: paginationMeta(total, page, limit) }
  }
}
