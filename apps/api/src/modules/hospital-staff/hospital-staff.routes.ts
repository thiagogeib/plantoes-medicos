import { Router } from "express"
import { HospitalStaffController } from "./hospital-staff.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"

export const hospitalStaffRouter = Router()

hospitalStaffRouter.post(
  "/invite",
  authenticate,
  authorize("HOSPITAL"),
  HospitalStaffController.invite
)

hospitalStaffRouter.get(
  "/hospital",
  authenticate,
  authorize("HOSPITAL"),
  HospitalStaffController.listHospitalStaff
)

hospitalStaffRouter.patch(
  "/:id/deactivate",
  authenticate,
  authorize("HOSPITAL"),
  HospitalStaffController.deactivate
)

hospitalStaffRouter.patch(
  "/:id/balance",
  authenticate,
  authorize("HOSPITAL"),
  HospitalStaffController.adjustBalance
)

hospitalStaffRouter.get(
  "/me",
  authenticate,
  authorize("PROFESSIONAL"),
  HospitalStaffController.listMyLinks
)

hospitalStaffRouter.patch(
  "/:id/respond",
  authenticate,
  authorize("PROFESSIONAL"),
  HospitalStaffController.respondInvite
)
