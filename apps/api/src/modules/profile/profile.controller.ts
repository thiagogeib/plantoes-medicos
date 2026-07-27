import { Request, Response, NextFunction } from "express"
import { ProfileService } from "./profile.service"
import { updateOwnHospitalProfileSchema, updateOwnProfessionalProfileSchema } from "./profile.dto"

export class ProfileController {
  static async updateHospital(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateOwnHospitalProfileSchema.parse(req.body)
      const user = await ProfileService.updateOwnHospital(req.user.userId, data)
      res.json({ data: user })
    } catch (error) {
      next(error)
    }
  }

  static async updateProfessional(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateOwnProfessionalProfileSchema.parse(req.body)
      const user = await ProfileService.updateOwnProfessional(req.user.userId, data)
      res.json({ data: user })
    } catch (error) {
      next(error)
    }
  }
}
