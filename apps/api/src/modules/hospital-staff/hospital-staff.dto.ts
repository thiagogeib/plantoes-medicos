import { z } from "zod"
import { StaffStatus } from "@prisma/client"

export const inviteStaffSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
})

export const respondInviteSchema = z.object({
  accept: z.boolean(),
})

export const adjustBalanceSchema = z
  .object({
    hourBankMinutes: z.number().int().optional(),
    availableDaysOff: z.number().int().min(0).optional(),
  })
  .refine((v) => v.hourBankMinutes !== undefined || v.availableDaysOff !== undefined, {
    message: "Informe ao menos um campo para ajustar",
  })

export const staffFiltersSchema = z.object({
  status: z.nativeEnum(StaffStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>
export type RespondInviteInput = z.infer<typeof respondInviteSchema>
export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>
export type StaffFilters = z.infer<typeof staffFiltersSchema>
