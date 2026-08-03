import { z } from "zod"
import { ShiftStatus, CompensationType, CouncilType } from "@prisma/client"

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const createShiftSchema = z
  .object({
    title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
    description: z.string().min(10, "Descrição deve ter no mínimo 10 caracteres"),
    specialtyId: z.string().cuid("specialtyId inválido"),
    requiredCouncilType: z
      .nativeEnum(CouncilType, {
        errorMap: () => ({ message: "Perfil exigido deve ser CRM (médico) ou COREN (enfermeiro)" }),
      })
      .default(CouncilType.CRM),
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
    location: z.string().min(3, "Localização deve ter no mínimo 3 caracteres"),
    slots: z.number().int().min(1, "Mínimo de 1 vaga").max(50, "Máximo de 50 vagas"),
    compensationType: z.nativeEnum(CompensationType).default(CompensationType.MONEY),
    compensationNote: z.string().max(280, "Nota deve ter no máximo 280 caracteres").optional(),
    coverageForAbsenceId: z.string().cuid("coverageForAbsenceId inválido").optional(),
  })
  .refine(
    (val) => val.compensationType !== CompensationType.OTHER || !!val.compensationNote?.trim(),
    { message: "Descreva a forma de compensação em compensationNote", path: ["compensationNote"] }
  )

export const updateShiftSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  specialtyId: z.string().cuid().optional(),
  requiredCouncilType: z.nativeEnum(CouncilType).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((val) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return new Date(val) >= today
    }, "A data não pode ser no passado")
    .optional(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  location: z.string().min(3).optional(),
  slots: z.number().int().min(1).max(50).optional(),
  status: z.nativeEnum(ShiftStatus).optional(),
  compensationType: z.nativeEnum(CompensationType).optional(),
  compensationNote: z.string().max(280, "Nota deve ter no máximo 280 caracteres").optional(),
  coverageForAbsenceId: z.string().cuid("coverageForAbsenceId inválido").optional(),
})

export const shiftFiltersSchema = z.object({
  specialtyId: z.string().cuid().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.nativeEnum(ShiftStatus).optional(),
  compensationType: z.nativeEnum(CompensationType).optional(),
  requiredCouncilType: z.nativeEnum(CouncilType).optional(),
  turno: z.enum(["MANHA", "TARDE", "NOITE"]).optional(),
  raioKm: z.coerce.number().positive().max(1000).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateShiftInput = z.infer<typeof createShiftSchema>
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>
export type ShiftFilters = z.infer<typeof shiftFiltersSchema>
