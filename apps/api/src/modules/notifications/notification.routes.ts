import { Router } from "express"
import { NotificationController } from "./notification.controller"
import { authenticate } from "../../shared/middleware/authenticate"

const router = Router()

router.get("/", authenticate, NotificationController.list)
router.patch("/read-all", authenticate, NotificationController.markAllRead)
router.patch("/:id/read", authenticate, NotificationController.markRead)

export { router as notificationRouter }
