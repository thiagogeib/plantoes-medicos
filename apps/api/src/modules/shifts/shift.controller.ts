import { Request, Response, NextFunction } from "express"
import { ShiftService } from "./shift.service"
import { createShiftSchema, updateShiftSchema, shiftFiltersSchema } from "./shift.dto"
import { NotFoundError, ForbiddenError } from "../../shared/errors/AppError"
import { prisma } from "../../prisma/client"

export class ShiftController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = shiftFiltersSchema.parse(req.query)
      const result = await ShiftService.listShifts(filters, req.user.userId, req.user.role)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const hospital = await prisma.hospitalProfile.findUnique({
        where: { userId: req.user.userId },
      })
      if (!hospital) throw new NotFoundError("Perfil de hospital não encontrado")

      const data = createShiftSchema.parse(req.body)
      const shift = await ShiftService.createShift(hospital.id, data)
      res.status(201).json({ data: shift })
    } catch (error) {
      next(error)
    }
  }

  static async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const shift = await ShiftService.getShift(req.params.id, req.user.userId, req.user.role)
      res.json({ data: shift })
    } catch (error) {
      next(error)
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const hospital = await prisma.hospitalProfile.findUnique({
        where: { userId: req.user.userId },
      })
      if (!hospital) throw new NotFoundError("Perfil de hospital não encontrado")

      const data = updateShiftSchema.parse(req.body)
      const shift = await ShiftService.updateShift(req.params.id, hospital.id, data)
      res.json({ data: shift })
    } catch (error) {
      next(error)
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const hospital = await prisma.hospitalProfile.findUnique({
        where: { userId: req.user.userId },
      })
      if (!hospital) throw new NotFoundError("Perfil de hospital não encontrado")

      const shift = await ShiftService.cancelShift(req.params.id, hospital.id)
      res.json({ data: shift })
    } catch (error) {
      next(error)
    }
  }

  static async listHospitalShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const hospital = await prisma.hospitalProfile.findUnique({
        where: { userId: req.user.userId },
      })
      if (!hospital) throw new NotFoundError("Perfil de hospital não encontrado")

      const filters = shiftFiltersSchema.parse(req.query)
      const result = await ShiftService.listHospitalShifts(hospital.id, filters)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }
}
