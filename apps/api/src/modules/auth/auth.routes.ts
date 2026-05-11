import { Router } from "express"
import { AuthController } from "./auth.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { validate } from "../../shared/middleware/validate"
import { loginSchema, registerHospitalSchema, registerProfessionalSchema } from "./auth.dto"

const router = Router()

router.post("/login", validate(loginSchema), AuthController.login)
router.post(
  "/register/hospital",
  validate(registerHospitalSchema),
  AuthController.registerHospital
)
router.post(
  "/register/professional",
  validate(registerProfessionalSchema),
  AuthController.registerProfessional
)
router.post("/refresh", AuthController.refresh)
router.post("/logout", AuthController.logout)
router.get("/me", authenticate, AuthController.me)

export { router as authRouter }
