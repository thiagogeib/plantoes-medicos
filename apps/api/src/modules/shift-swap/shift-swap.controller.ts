import { Request, Response, NextFunction } from "express"
import { ShiftSwapService } from "./shift-swap.service"
import { createSwapRequestSchema, approveSwapSchema } from "./shift-swap.dto"
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

export class ShiftSwapController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const data = createSwapRequestSchema.parse(req.body)
      const swap = await ShiftSwapService.createSwapRequest(professionalId, data)
      res.status(201).json({ data: swap })
    } catch (error) {
      next(error)
    }
  }

  static async listAvailable(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const data = await ShiftSwapService.listAvailableForProfessional(professionalId)
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }

  static async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const data = await ShiftSwapService.listMyRequests(professionalId)
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }

  static async expressInterest(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const interest = await ShiftSwapService.expressInterest(req.params.id, professionalId)
      res.status(201).json({ data: interest })
    } catch (error) {
      next(error)
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const swap = await ShiftSwapService.cancel(req.params.id, professionalId)
      res.json({ data: swap })
    } catch (error) {
      next(error)
    }
  }

  static async listForHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const data = await ShiftSwapService.listForHospital(hospitalId)
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }

  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const { interestId } = approveSwapSchema.parse(req.body)
      const swap = await ShiftSwapService.approve(req.params.id, hospitalId, interestId)
      res.json({ data: swap })
    } catch (error) {
      next(error)
    }
  }

  static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const swap = await ShiftSwapService.reject(req.params.id, hospitalId)
      res.json({ data: swap })
    } catch (error) {
      next(error)
    }
  }
}
