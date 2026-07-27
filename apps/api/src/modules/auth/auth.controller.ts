import { Request, Response, NextFunction } from "express"
import { AuthService } from "./auth.service"
import { LoginDTO, RegisterHospitalDTO, RegisterProfessionalDTO, ForgotPasswordDTO, ResetPasswordDTO } from "./auth.dto"

const REFRESH_COOKIE_NAME = "refreshToken"

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body as LoginDTO)
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions)
      res.status(200).json({ data: { accessToken: result.accessToken, user: result.user } })
    } catch (err) {
      next(err)
    }
  }

  static async registerHospital(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.registerHospital(req.body as RegisterHospitalDTO)
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions)
      res.status(201).json({ data: { accessToken: result.accessToken, user: result.user } })
    } catch (err) {
      next(err)
    }
  }

  static async registerProfessional(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.registerProfessional(
        req.body as RegisterProfessionalDTO
      )
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions)
      res.status(201).json({ data: { accessToken: result.accessToken, user: result.user } })
    } catch (err) {
      next(err)
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined
      if (!token) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Refresh token ausente" } })
        return
      }
      const result = await AuthService.refresh(token)
      res.status(200).json({ data: { accessToken: result.accessToken } })
    } catch (err) {
      next(err)
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined
      if (token) {
        await AuthService.logout(token)
      }
      res.clearCookie(REFRESH_COOKIE_NAME)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user.userId)
      res.status(200).json({ data: { user } })
    } catch (err) {
      next(err)
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.forgotPassword((req.body as ForgotPasswordDTO).email)
      res.status(200).json({
        data: { message: "Se este email estiver cadastrado, você receberá um link de redefinição." },
      })
    } catch (err) {
      next(err)
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body as ResetPasswordDTO
      await AuthService.resetPassword(token, password)
      res.status(200).json({ data: { message: "Senha redefinida com sucesso." } })
    } catch (err) {
      next(err)
    }
  }
}
