import { Router } from "express"
import { ShiftController } from "./shift.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"

export const hospitalRouter = Router()

hospitalRouter.get("/me/shifts", authenticate, authorize("HOSPITAL"), ShiftController.listHospitalShifts)
