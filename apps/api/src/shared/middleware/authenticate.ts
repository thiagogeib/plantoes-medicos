import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { UnauthorizedError } from "../errors/AppError"

interface JWTPayload {
  sub: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string
        role: string
      }
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Token não fornecido"))
  }

  const token = authHeader.split(" ")[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!, {
      algorithms: ["HS256"],
    }) as JWTPayload

    req.user = {
      userId: payload.sub,
      role: payload.role,
    }

    next()
  } catch {
    next(new UnauthorizedError("Token inválido ou expirado"))
  }
}
