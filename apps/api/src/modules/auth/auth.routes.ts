import { Router } from "express"
import { AuthController } from "./auth.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { validate } from "../../shared/middleware/validate"
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from "../../shared/middleware/rateLimit"
import {
  loginSchema,
  registerHospitalSchema,
  registerProfessionalSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.dto"

const router = Router()

router.post("/login", loginLimiter, validate(loginSchema), AuthController.login)
router.post(
  "/register/hospital",
  registerLimiter,
  validate(registerHospitalSchema),
  AuthController.registerHospital
)
router.post(
  "/register/professional",
  registerLimiter,
  validate(registerProfessionalSchema),
  AuthController.registerProfessional
)
router.post("/refresh", AuthController.refresh)
router.post("/logout", AuthController.logout)
router.get("/me", authenticate, AuthController.me)
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  AuthController.forgotPassword
)
router.post("/reset-password", validate(resetPasswordSchema), AuthController.resetPassword)

export { router as authRouter }
