import { Router } from "express"
import { AdminController } from "./admin.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"

export const adminRouter = Router()

adminRouter.use(authenticate, authorize("ADMIN"))

adminRouter.get("/metrics", AdminController.getMetrics)
adminRouter.get("/users", AdminController.listUsers)
adminRouter.get("/users/:id", AdminController.getUser)
adminRouter.patch("/users/:id/status", AdminController.updateUserStatus)
adminRouter.get("/shifts", AdminController.listShifts)
