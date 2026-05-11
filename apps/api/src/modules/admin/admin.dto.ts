import { z } from "zod"
import { UserRole, UserStatus, ShiftStatus } from "@prisma/client"

const passwordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .regex(/[A-Z]/, "Senha deve conter ao menos uma letra maiúscula")
  .regex(/[0-9]/, "Senha deve conter ao menos um número")

export const adminCreateHospitalSchema = z.object({
  email: z.string().email("Email inválido"),
  password: passwordSchema,
  name: z.string().min(1, "Nome obrigatório"),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos"),
  phone: z.string().min(1, "Telefone obrigatório"),
  street: z.string().min(1, "Rua obrigatória"),
  number: z.string().min(1, "Número obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro obrigatório"),
  city: z.string().min(1, "Cidade obrigatória"),
  state: z.string().length(2, "Estado deve ter 2 letras"),
  zipCode: z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos"),
})

export const adminCreateProfessionalSchema = z.object({
  email: z.string().email("Email inválido"),
  password: passwordSchema,
  name: z.string().min(1, "Nome obrigatório"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
  phone: z.string().min(1, "Telefone obrigatório"),
  councilType: z.enum(["CRM", "COREN"], {
    errorMap: () => ({ message: "Tipo de conselho deve ser CRM ou COREN" }),
  }),
  councilNumber: z.string().min(1, "Número do conselho obrigatório"),
  councilState: z.string().length(2, "Estado do conselho deve ter 2 letras"),
  specialtyIds: z.array(z.string()).min(1, "Pelo menos uma especialidade deve ser informada"),
})

export type AdminCreateHospitalInput = z.infer<typeof adminCreateHospitalSchema>
export type AdminCreateProfessionalInput = z.infer<typeof adminCreateProfessionalSchema>

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
