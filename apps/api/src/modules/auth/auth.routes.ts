import { Router } from "express"
import rateLimit from "express-rate-limit"
import { AuthController } from "./auth.controller"
import { authenticate } from "../../shared/middleware/authenticate"
import { validate } from "../../shared/middleware/validate"
import { loginSchema, registerHospitalSchema, registerProfessionalSchema } from "./auth.dto"

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    },
  },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Muitas tentativas de cadastro. Tente novamente mais tarde.",
    },
  },
})

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

export { router as authRouter }
