import { Request, Response, NextFunction } from "express"
import { ForbiddenError } from "../errors/AppError"

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError("Sem permissão para acessar este recurso"))
    }
    next()
  }
}
