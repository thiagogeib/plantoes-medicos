import { Request, Response, NextFunction } from "express"
import { ZodSchema, ZodError } from "zod"
import { AppError } from "../errors/AppError"

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        const details: Record<string, string> = {}
        for (const issue of err.issues) {
          const field = issue.path.join(".")
          details[field] = issue.message
        }
        return next(
          Object.assign(new AppError("Dados inválidos", 400, "VALIDATION_ERROR"), { details })
        )
      }
      next(err)
    }
  }
}
