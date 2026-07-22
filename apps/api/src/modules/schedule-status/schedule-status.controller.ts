import { Request, Response, NextFunction } from "express"
import { ScheduleStatusService } from "./schedule-status.service"
import { scheduleStatusQuerySchema } from "./schedule-status.dto"
import { NotFoundError } from "../../shared/errors/AppError"
import { prisma } from "../../prisma/client"

export class ScheduleStatusController {
  static async getDailyStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const hospital = await prisma.hospitalProfile.findUnique({ where: { userId: req.user.userId } })
      if (!hospital) throw new NotFoundError("Perfil de hospital não encontrado")

      const { date } = scheduleStatusQuerySchema.parse(req.query)
      const data = await ScheduleStatusService.getDailyStatus(hospital.id, date)
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }
}
