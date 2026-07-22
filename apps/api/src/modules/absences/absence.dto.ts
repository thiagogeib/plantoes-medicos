import { z } from "zod"
import { AbsenceType } from "@prisma/client"

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")

export const createAbsenceSchema = z
  .object({
    hospitalId: z.string().cuid("hospitalId inválido"),
    type: z.nativeEnum(AbsenceType, { errorMap: () => ({ message: "Tipo de afastamento inválido" }) }),
    startDate: dateSchema,
    endDate: dateSchema,
    note: z.string().max(280, "Nota deve ter no máximo 280 caracteres").optional(),
  })
  .refine((v) => new Date(v.endDate) >= new Date(v.startDate), {
    message: "Data final deve ser igual ou posterior à data inicial",
    path: ["endDate"],
  })

export const createAbsenceForStaffSchema = z
  .object({
    professionalId: z.string().cuid("professionalId inválido"),
    type: z.nativeEnum(AbsenceType, { errorMap: () => ({ message: "Tipo de afastamento inválido" }) }),
    startDate: dateSchema,
    endDate: dateSchema,
    note: z.string().max(280, "Nota deve ter no máximo 280 caracteres").optional(),
  })
  .refine((v) => new Date(v.endDate) >= new Date(v.startDate), {
    message: "Data final deve ser igual ou posterior à data inicial",
    path: ["endDate"],
  })

export type CreateAbsenceInput = z.infer<typeof createAbsenceSchema>
export type CreateAbsenceForStaffInput = z.infer<typeof createAbsenceForStaffSchema>
