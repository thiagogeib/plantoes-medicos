import { Router } from "express"
import { ProfileController } from "./profile.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { authorize } from "../../shared/middleware/authorize"

export const hospitalProfileRouter = Router()
hospitalProfileRouter.patch(
  "/me",
  authenticate,
  authorize("HOSPITAL"),
  ProfileController.updateHospital
)

export const professionalProfileRouter = Router()
professionalProfileRouter.patch(
  "/me",
  authenticate,
  authorize("PROFESSIONAL"),
  ProfileController.updateProfessional
)
