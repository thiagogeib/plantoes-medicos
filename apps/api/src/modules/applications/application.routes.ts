import { Router } from "express"
import { ApplicationController } from "./application.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"

export const applicationRouter = Router()

applicationRouter.get(
  "/me",
  authenticate,
  authorize("PROFESSIONAL"),
  ApplicationController.listMyApplications
)

applicationRouter.get("/:id", authenticate, ApplicationController.getOne)

applicationRouter.patch(
  "/:id/status",
  authenticate,
  authorize("HOSPITAL"),
  ApplicationController.updateStatus
)

applicationRouter.patch(
  "/:id/withdraw",
  authenticate,
  authorize("PROFESSIONAL"),
  ApplicationController.withdraw
)
