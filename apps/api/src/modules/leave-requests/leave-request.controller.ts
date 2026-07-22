import { Request, Response, NextFunction } from "express"
import { LeaveRequestService } from "./leave-request.service"
import { createLeaveRequestSchema, selectCoverSchema } from "./leave-request.dto"
import { NotFoundError } from "../../shared/errors/AppError"
import { prisma } from "../../prisma/client"

async function getHospitalId(userId: string): Promise<string> {
  const hospital = await prisma.hospitalProfile.findUnique({ where: { userId } })
  if (!hospital) throw new NotFoundError("Perfil de hospital não encontrado")
  return hospital.id
}

async function getProfessionalId(userId: string): Promise<string> {
  const professional = await prisma.professionalProfile.findUnique({ where: { userId } })
  if (!professional) throw new NotFoundError("Perfil profissional não encontrado")
  return professional.id
}

export class LeaveRequestController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const data = createLeaveRequestSchema.parse(req.body)
      const leave = await LeaveRequestService.create(professionalId, data)
      res.status(201).json({ data: leave })
    } catch (error) {
      next(error)
    }
  }

  static async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const data = await LeaveRequestService.listMine(professionalId)
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const leave = await LeaveRequestService.cancel(req.params.id, professionalId)
      res.json({ data: leave })
    } catch (error) {
      next(error)
    }
  }

  static async listAvailable(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const data = await LeaveRequestService.listAvailableForProfessional(professionalId)
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }

  static async expressInterest(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const interest = await LeaveRequestService.expressInterest(req.params.id, professionalId)
      res.status(201).json({ data: interest })
    } catch (error) {
      next(error)
    }
  }

  static async listForHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const data = await LeaveRequestService.listForHospital(hospitalId)
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }

  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const leave = await LeaveRequestService.approve(req.params.id, hospitalId)
      res.json({ data: leave })
    } catch (error) {
      next(error)
    }
  }

  static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const leave = await LeaveRequestService.reject(req.params.id, hospitalId)
      res.json({ data: leave })
    } catch (error) {
      next(error)
    }
  }

  static async selectCover(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const { interestId } = selectCoverSchema.parse(req.body)
      const leave = await LeaveRequestService.selectCover(req.params.id, hospitalId, interestId)
      res.json({ data: leave })
    } catch (error) {
      next(error)
    }
  }
}
