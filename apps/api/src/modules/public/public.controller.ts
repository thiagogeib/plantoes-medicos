import { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { ApplicationStatus, ShiftStatus } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { paginate, paginationMeta } from "../../shared/helpers/pagination"
import { NotFoundError } from "../../shared/errors/AppError"

const TURNO_RANGES: Record<string, { gte: string; lt: string }> = {
  MANHA: { gte: "00:00", lt: "12:00" },
  TARDE: { gte: "12:00", lt: "18:00" },
  NOITE: { gte: "18:00", lt: "24:00" },
}

const listFiltersSchema = z.object({
  specialtyId: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  compensationType: z.enum(["MONEY", "HOUR_BANK", "OTHER"]).optional(),
  turno: z.enum(["MANHA", "TARDE", "NOITE"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

const shiftInclude = {
  specialty: true,
  hospital: {
    select: { id: true, name: true, city: true, state: true },
  },
}

export class PublicController {
  static async listShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const { specialtyId, city, state, compensationType, turno, page, limit } =
        listFiltersSchema.parse(req.query)
      const { skip, take } = paginate(page, limit)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const where: Record<string, unknown> = { status: ShiftStatus.OPEN, date: { gte: today } }
      if (specialtyId) where.specialtyId = specialtyId
      if (compensationType) where.compensationType = compensationType
      if (turno) where.startTime = TURNO_RANGES[turno]
      if (city || state) {
        where.hospital = {
          ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
          ...(state ? { state } : {}),
        }
      }

      const [data, total] = await Promise.all([
        prisma.shift.findMany({
          where,
          skip,
          take,
          orderBy: { date: "asc" },
          include: shiftInclude,
        }),
        prisma.shift.count({ where }),
      ])

      res.json({ data, pagination: paginationMeta(total, page, limit) })
    } catch (error) {
      next(error)
    }
  }

  static async getShift(req: Request, res: Response, next: NextFunction) {
    try {
      const shift = await prisma.shift.findUnique({
        where: { id: req.params.id },
        include: shiftInclude,
      })
      if (!shift) throw new NotFoundError("Plantão não encontrado")
      res.json({ data: shift })
    } catch (error) {
      next(error)
    }
  }

  static async stats(_req: Request, res: Response, next: NextFunction) {
    try {
      const [hospitals, professionals, shiftsFilled, openShifts] = await Promise.all([
        prisma.hospitalProfile.count(),
        prisma.professionalProfile.count(),
        prisma.application.count({ where: { status: ApplicationStatus.ACCEPTED } }),
        prisma.shift.count({ where: { status: ShiftStatus.OPEN, date: { gte: new Date() } } }),
      ])
      res.json({ data: { hospitals, professionals, shiftsFilled, openShifts } })
    } catch (error) {
      next(error)
    }
  }
}
