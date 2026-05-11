import { z } from "zod"
import { UserRole, UserStatus, ShiftStatus } from "@prisma/client"

export const listUsersSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus, {
    errorMap: () => ({ message: "Status inválido" }),
  }),
})

export const adminShiftFiltersSchema = z.object({
  status: z.nativeEnum(ShiftStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListUsersInput = z.infer<typeof listUsersSchema>
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>
export type AdminShiftFilters = z.infer<typeof adminShiftFiltersSchema>
