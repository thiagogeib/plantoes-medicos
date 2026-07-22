import { z } from "zod"

export const createSwapRequestSchema = z.object({
  shiftId: z.string().cuid("shiftId inválido"),
  reason: z.string().max(280, "Motivo deve ter no máximo 280 caracteres").optional(),
})

export const approveSwapSchema = z.object({
  interestId: z.string().cuid("interestId inválido"),
})

export type CreateSwapRequestInput = z.infer<typeof createSwapRequestSchema>
export type ApproveSwapInput = z.infer<typeof approveSwapSchema>
