import { Request, Response, NextFunction } from "express"
import { ZodError } from "zod"
import { Prisma } from "@prisma/client"
import { AppError } from "./AppError"

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    })
    return
  }

  if (err instanceof ZodError) {
    const details: Record<string, string> = {}
    for (const issue of err.issues) {
      const field = issue.path.join(".")
      details[field] = issue.message
    }
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos",
        details,
      },
    })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[]) ?? []
      let message = "Registro já cadastrado"
      if (target.includes("email")) message = "Email já cadastrado"
      else if (target.includes("cnpj")) message = "CNPJ já cadastrado"
      else if (target.includes("cpf")) message = "CPF já cadastrado"

      res.status(409).json({
        error: {
          code: "CONFLICT",
          message,
        },
      })
      return
    }
  }

  console.error(err)
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Erro interno do servidor",
    },
  })
}
