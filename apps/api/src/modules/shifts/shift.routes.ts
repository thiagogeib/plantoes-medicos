import { Router } from "express"
import { ShiftController } from "./shift.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"
import { shiftApplicationsRouter } from "../applications/shiftApplications.routes"

export const shiftRouter = Router()

shiftRouter.get("/", authenticate, ShiftController.list)
shiftRouter.post("/", authenticate, authorize("HOSPITAL"), ShiftController.create)
shiftRouter.get("/:id", authenticate, ShiftController.getOne)
shiftRouter.patch("/:id", authenticate, authorize("HOSPITAL"), ShiftController.update)
shiftRouter.delete("/:id", authenticate, authorize("HOSPITAL"), ShiftController.cancel)
shiftRouter.delete("/:id/permanent", authenticate, authorize("HOSPITAL"), ShiftController.hardDelete)

shiftRouter.use("/:shiftId/applications", shiftApplicationsRouter)
