import { Request, Response, NextFunction } from "express"
import { NotificationQueryService } from "./notification.service"

export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20
      const result = await NotificationQueryService.list(req.user.userId, limit)
      res.status(200).json({ data: result.data, unreadCount: result.unreadCount })
    } catch (err) {
      next(err)
    }
  }

  static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await NotificationQueryService.markRead(req.params.id, req.user.userId)
      res.status(200).json({ data: notification })
    } catch (err) {
      next(err)
    }
  }

  static async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationQueryService.markAllRead(req.user.userId)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }
}
