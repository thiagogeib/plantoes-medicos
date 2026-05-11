import { z } from "zod"
import { ApplicationStatus } from "@prisma/client"

export const createApplicationSchema = z.object({
  message: z.string().max(500, "Mensagem deve ter no máximo 500 caracteres").optional(),
})

export const updateStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"], {
    errorMap: () => ({ message: "Status deve ser ACCEPTED ou REJECTED" }),
  }),
})

export const applicationFiltersSchema = z.object({
  status: z.nativeEnum(ApplicationStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>
export type ApplicationFilters = z.infer<typeof applicationFiltersSchema>
