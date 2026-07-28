import { z } from "zod"
import { StaffStatus, StaffType } from "@prisma/client"

export const inviteStaffSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
  type: z.nativeEnum(StaffType).optional(),
})

export const respondInviteSchema = z.object({
  accept: z.boolean(),
})

export const updateStaffTypeSchema = z.object({
  type: z.nativeEnum(StaffType, { errorMap: () => ({ message: "Tipo deve ser FIXO ou AVULSO" }) }),
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

export const candidateFiltersSchema = z.object({
  specialtyId: z.string().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>
export type RespondInviteInput = z.infer<typeof respondInviteSchema>
export type UpdateStaffTypeInput = z.infer<typeof updateStaffTypeSchema>
export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>
export type StaffFilters = z.infer<typeof staffFiltersSchema>
export type CandidateFilters = z.infer<typeof candidateFiltersSchema>
