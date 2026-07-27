import { Request, Response, NextFunction } from "express"
import { ApplicationService } from "./application.service"
import {
  createApplicationSchema,
  updateStatusSchema,
  applicationFiltersSchema,
} from "./application.dto"
import { NotFoundError } from "../../shared/errors/AppError"
import { prisma } from "../../prisma/client"

export class ApplicationController {
  static async listShiftApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ApplicationService.listShiftApplications(
        req.params.shiftId,
        req.user.userId,
        req.user.role
      )
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }

  static async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const professional = await prisma.professionalProfile.findUnique({
        where: { userId: req.user.userId },
      })
      if (!professional) throw new NotFoundError("Perfil profissional não encontrado")

      const data = createApplicationSchema.parse(req.body)
      const application = await ApplicationService.applyToShift(
        req.params.shiftId,
        professional.id,
        data
      )
      res.status(201).json({ data: application })
    } catch (error) {
      next(error)
    }
  }

  static async listMyApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const professional = await prisma.professionalProfile.findUnique({
        where: { userId: req.user.userId },
      })
      if (!professional) throw new NotFoundError("Perfil profissional não encontrado")

      const filters = applicationFiltersSchema.parse(req.query)
      const result = await ApplicationService.listMyApplications(professional.id, filters)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  static async myStats(req: Request, res: Response, next: NextFunction) {
    try {
      const professional = await prisma.professionalProfile.findUnique({
        where: { userId: req.user.userId },
      })
      if (!professional) throw new NotFoundError("Perfil profissional não encontrado")

      const stats = await ApplicationService.getMyStats(professional.id)
      res.json({ data: stats })
    } catch (error) {
      next(error)
    }
  }

  static async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const application = await ApplicationService.getApplication(
        req.params.id,
        req.user.userId,
        req.user.role
      )
      res.json({ data: application })
    } catch (error) {
      next(error)
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateStatusSchema.parse(req.body)
      const application = await ApplicationService.updateApplicationStatus(
        req.params.id,
        req.user.userId,
        data
      )
      res.json({ data: application })
    } catch (error) {
      next(error)
    }
  }

  static async withdraw(req: Request, res: Response, next: NextFunction) {
    try {
      const application = await ApplicationService.withdrawApplication(
        req.params.id,
        req.user.userId
      )
      res.json({ data: application })
    } catch (error) {
      next(error)
    }
  }
}
