import { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { ShiftStatus } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { paginate, paginationMeta } from "../../shared/helpers/pagination"
import { NotFoundError } from "../../shared/errors/AppError"

const listFiltersSchema = z.object({
  specialtyId: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
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
      const { specialtyId, city, state, page, limit } = listFiltersSchema.parse(req.query)
      const { skip, take } = paginate(page, limit)

      const where: Record<string, unknown> = { status: ShiftStatus.OPEN }
      if (specialtyId) where.specialtyId = specialtyId
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
}
