import { Router } from "express"
import { ApplicationController } from "./application.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"

export const shiftApplicationsRouter = Router({ mergeParams: true })

shiftApplicationsRouter.get(
  "/",
  authenticate,
  authorize("HOSPITAL", "ADMIN"),
  ApplicationController.listShiftApplications
)

shiftApplicationsRouter.post(
  "/",
  authenticate,
  authorize("PROFESSIONAL"),
  ApplicationController.apply
)
