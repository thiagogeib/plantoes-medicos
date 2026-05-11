import { Request, Response, NextFunction } from "express"
import { SpecialtyService } from "./specialty.service"

export class SpecialtyController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SpecialtyService.listAll()
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }
}
