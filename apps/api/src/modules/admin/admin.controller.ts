import { Request, Response, NextFunction } from "express"
import { AdminService } from "./admin.service"
import { listUsersSchema, updateUserStatusSchema, adminShiftFiltersSchema } from "./admin.dto"

export class AdminController {
  static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AdminService.getMetrics()
      res.json({ data })
    } catch (error) {
      next(error)
    }
  }

  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = listUsersSchema.parse(req.query)
      const result = await AdminService.listUsers(filters)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  static async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AdminService.getUser(req.params.id)
      res.json({ data: user })
    } catch (error) {
      next(error)
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = updateUserStatusSchema.parse(req.body)
      const user = await AdminService.updateUserStatus(req.params.id, status)
      res.json({ data: user })
    } catch (error) {
      next(error)
    }
  }

  static async listShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = adminShiftFiltersSchema.parse(req.query)
      const result = await AdminService.listShifts(filters)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }
}
