import { Request, Response, NextFunction } from "express"
import { prisma } from "../../prisma/client"
import { BulkService } from "./bulk.service"
import { NotFoundError, AppError } from "../../shared/errors/AppError"

async function getHospitalId(userId: string): Promise<string> {
  const hospital = await prisma.hospitalProfile.findUnique({ where: { userId } })
  if (!hospital) throw new NotFoundError("Perfil de hospital não encontrado")
  return hospital.id
}

export class BulkController {
  static shiftTemplate(_req: Request, res: Response) {
    const csv = BulkService.getShiftTemplateCsv()
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", 'attachment; filename="modelo-plantoes.csv"')
    res.send(csv)
  }

  static async importShifts(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError("Envie um arquivo CSV", 400, "FILE_REQUIRED")
      const hospitalId = await getHospitalId(req.user.userId)
      const results = await BulkService.importShifts(hospitalId, req.file.buffer)
      res.json({
        data: {
          total: results.length,
          sucesso: results.filter((r) => r.sucesso).length,
          falhas: results.filter((r) => !r.sucesso).length,
          resultados: results,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  static async exportStaffHours(req: Request, res: Response, next: NextFunction) {
    try {
      const hospitalId = await getHospitalId(req.user.userId)
      const csv = await BulkService.exportStaffHours(hospitalId)
      res.setHeader("Content-Type", "text/csv; charset=utf-8")
      res.setHeader("Content-Disposition", 'attachment; filename="horas-da-equipe.csv"')
      res.send(csv)
    } catch (error) {
      next(error)
    }
  }

  static async importStaffHours(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError("Envie um arquivo CSV", 400, "FILE_REQUIRED")
      const hospitalId = await getHospitalId(req.user.userId)
      const results = await BulkService.importStaffHours(hospitalId, req.file.buffer)
      res.json({
        data: {
          total: results.length,
          sucesso: results.filter((r) => r.sucesso).length,
          falhas: results.filter((r) => !r.sucesso).length,
          resultados: results,
        },
      })
    } catch (error) {
      next(error)
    }
  }
}
