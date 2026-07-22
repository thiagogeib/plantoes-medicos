import { Request, Response, NextFunction } from "express"
import { AbsenceService } from "./absence.service"
import { createAbsenceSchema, createAbsenceForStaffSchema } from "./absence.dto"
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

export class AbsenceController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const data = createAbsenceSchema.parse(req.body)
      const absence = await AbsenceService.createByProfessional(professionalId, data)
      res.status(201).json({ data: absence })
    } catch (error) {
      next(error)
    }
  }

  static async createForStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const data = createAbsenceForStaffSchema.parse(req.body)
      const absence = await AbsenceService.createByHospital(hospitalId, data)
      res.status(201).json({ data: absence })
    } catch (error) {
      next(error)
    }
  }

  static async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const data = await AbsenceService.listMine(professionalId)
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }

  static async listForHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const data = await AbsenceService.listForHospital(hospitalId)
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }
}
