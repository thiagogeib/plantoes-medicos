import { Router } from "express"
import { AbsenceController } from "./absence.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"

export const absenceRouter = Router()

absenceRouter.post("/", authenticate, authorize("PROFESSIONAL"), AbsenceController.create)
absenceRouter.get("/mine", authenticate, authorize("PROFESSIONAL"), AbsenceController.listMine)

absenceRouter.post("/hospital", authenticate, authorize("HOSPITAL"), AbsenceController.createForStaff)
absenceRouter.get("/hospital", authenticate, authorize("HOSPITAL"), AbsenceController.listForHospital)
