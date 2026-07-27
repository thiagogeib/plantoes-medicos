import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
})

const passwordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .regex(/[A-Z]/, "Senha deve conter ao menos uma letra maiúscula")
  .regex(/[0-9]/, "Senha deve conter ao menos um número")

export const registerHospitalSchema = z.object({
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

export const registerProfessionalSchema = z.object({
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
  specialtyIds: z
    .array(z.string())
    .min(1, "Pelo menos uma especialidade deve ser informada"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token obrigatório"),
  password: passwordSchema,
})

export type LoginDTO = z.infer<typeof loginSchema>
export type RegisterHospitalDTO = z.infer<typeof registerHospitalSchema>
export type RegisterProfessionalDTO = z.infer<typeof registerProfessionalSchema>
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>
