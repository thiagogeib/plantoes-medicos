import { z } from "zod"

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const createLeaveRequestSchema = z.object({
  hospitalId: z.string().cuid("hospitalId inválido").optional(),
  specialtyId: z.string().cuid("Selecione a área de atuação"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
    .refine((val) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return new Date(val) >= today
    }, "A data não pode ser no passado"),
  startTime: z.string().regex(timeRegex, "startTime deve estar no formato HH:mm"),
  endTime: z.string().regex(timeRegex, "endTime deve estar no formato HH:mm"),
  reason: z.string().max(280, "Motivo deve ter no máximo 280 caracteres").optional(),
})

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>
