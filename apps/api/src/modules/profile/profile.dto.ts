import { z } from "zod"
import { CouncilType } from "@prisma/client"

export const updateOwnHospitalProfileSchema = z.object({
  email: z.string().email("Email inválido").optional(),
  name: z.string().min(1, "Nome obrigatório").optional(),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos").optional(),
  phone: z.string().min(1, "Telefone obrigatório").optional(),
  street: z.string().min(1, "Rua obrigatória").optional(),
  number: z.string().min(1, "Número obrigatório").optional(),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro obrigatório").optional(),
  city: z.string().min(1, "Cidade obrigatória").optional(),
  state: z.string().length(2, "Estado deve ter 2 letras").optional(),
  zipCode: z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos").optional(),
  defaultRejectionMessage: z.string().max(500, "Máximo 500 caracteres").optional(),
  leaveCoverageDeadlineDays: z.coerce.number().int().min(1, "Mínimo 1 dia").max(30, "Máximo 30 dias").optional(),
  longLeaveThresholdMinutes: z.coerce.number().int().min(60, "Mínimo 1 hora").max(2400, "Máximo 40 horas").optional(),
})

export const updateOwnProfessionalProfileSchema = z.object({
  email: z.string().email("Email inválido").optional(),
  name: z.string().min(1, "Nome obrigatório").optional(),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos").optional(),
  phone: z.string().min(1, "Telefone obrigatório").optional(),
  councilType: z.nativeEnum(CouncilType).optional(),
  councilNumber: z.string().min(1, "Número do conselho obrigatório").optional(),
  councilState: z.string().length(2, "Estado do conselho deve ter 2 letras").optional(),
  street: z.string().min(1, "Rua obrigatória").optional(),
  number: z.string().min(1, "Número obrigatório").optional(),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro obrigatório").optional(),
  city: z.string().min(1).optional(),
  state: z.string().length(2, "Estado deve ter 2 letras").optional(),
  zipCode: z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos").optional(),
  specialtyIds: z.array(z.string()).min(1, "Selecione ao menos uma especialidade").optional(),
})

export type UpdateOwnHospitalProfileInput = z.infer<typeof updateOwnHospitalProfileSchema>
export type UpdateOwnProfessionalProfileInput = z.infer<typeof updateOwnProfessionalProfileSchema>
