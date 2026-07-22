import { z } from "zod"

export const createLeaveRequestSchema = z.object({
  shiftId: z.string().cuid("shiftId inválido"),
  reason: z.string().max(280, "Motivo deve ter no máximo 280 caracteres").optional(),
})

export const selectCoverSchema = z.object({
  interestId: z.string().cuid("interestId inválido"),
})

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>
export type SelectCoverInput = z.infer<typeof selectCoverSchema>
