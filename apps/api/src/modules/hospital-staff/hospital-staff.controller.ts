import { Request, Response, NextFunction } from "express"
import { HospitalStaffService } from "./hospital-staff.service"
import {
  inviteStaffSchema,
  respondInviteSchema,
  adjustBalanceSchema,
  updateStaffTypeSchema,
  staffFiltersSchema,
} from "./hospital-staff.dto"
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

export class HospitalStaffController {
  static async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const { cpf, type } = inviteStaffSchema.parse(req.body)
      const staff = await HospitalStaffService.invite(hospitalId, cpf, type)
      res.status(201).json({ data: staff })
    } catch (error) {
      next(error)
    }
  }

  static async updateType(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const data = updateStaffTypeSchema.parse(req.body)
      const staff = await HospitalStaffService.updateType(req.params.id, hospitalId, data)
      res.json({ data: staff })
    } catch (error) {
      next(error)
    }
  }

  static async listHospitalStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const filters = staffFiltersSchema.parse(req.query)
      const result = await HospitalStaffService.listHospitalStaff(hospitalId, filters)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  static async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const staff = await HospitalStaffService.deactivate(req.params.id, hospitalId)
      res.json({ data: staff })
    } catch (error) {
      next(error)
    }
  }

  static async adjustBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const data = adjustBalanceSchema.parse(req.body)
      const staff = await HospitalStaffService.adjustBalance(req.params.id, hospitalId, data)
      res.json({ data: staff })
    } catch (error) {
      next(error)
    }
  }

  static async listMyLinks(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const data = await HospitalStaffService.listMyLinks(professionalId)
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }

  static async respondInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const professionalId = await getProfessionalId(req.user.userId)
      const { accept } = respondInviteSchema.parse(req.body)
      const staff = await HospitalStaffService.respondInvite(req.params.id, professionalId, accept)
      res.json({ data: staff })
    } catch (error) {
      next(error)
    }
  }
}
