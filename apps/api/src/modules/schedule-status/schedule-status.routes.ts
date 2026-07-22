import { Router } from "express"
import { ScheduleStatusController } from "./schedule-status.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"

export const scheduleStatusRouter = Router()

scheduleStatusRouter.get(
  "/",
  authenticate,
  authorize("HOSPITAL"),
  ScheduleStatusController.getDailyStatus
)
