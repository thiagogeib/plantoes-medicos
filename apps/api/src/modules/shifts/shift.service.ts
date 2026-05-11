import { ShiftStatus } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { NotFoundError, ForbiddenError, ConflictError, AppError } from "../../shared/errors/AppError"
import { paginate, paginationMeta } from "../../shared/helpers/pagination"
import type { CreateShiftInput, UpdateShiftInput, ShiftFilters } from "./shift.dto"

export class ShiftService {
  static async listShifts(
    filters: ShiftFilters,
    requestingUserId?: string,
    role?: string
  ) {
    const { specialtyId, city, state, dateFrom, dateTo, status, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const where: Record<string, unknown> = {}

    if (role === "PROFESSIONAL") {
      where.status = status ?? ShiftStatus.OPEN
    } else if (status) {
      where.status = status
    }

    if (specialtyId) where.specialtyId = specialtyId

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

    return prisma.shift.create({
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
      },
      include: {
        specialty: true,
        hospital: {
          select: { id: true, name: true, city: true, state: true },
        },
      },
    })
  }

  static async getShift(id: string, requestingUserId?: string, role?: string) {
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        specialty: true,
        hospital: {
          select: { id: true, name: true, city: true, state: true, phone: true },
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

    return prisma.shift.update({
      where: { id },
      data: updateData,
      include: {
        specialty: true,
        hospital: {
          select: { id: true, name: true, city: true, state: true },
        },
      },
    })
  }

  static async cancelShift(id: string, hospitalId: string) {
    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift) throw new NotFoundError("Plantão não encontrado")
    if (shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão para cancelar este plantão")
    if (shift.status === ShiftStatus.FILLED) throw new ConflictError("Não é possível cancelar um plantão já preenchido")
    if (shift.status === ShiftStatus.CANCELLED) throw new ConflictError("Plantão já está cancelado")

    return prisma.shift.update({
      where: { id },
      data: { status: ShiftStatus.CANCELLED },
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
