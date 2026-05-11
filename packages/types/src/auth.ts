import type { User, UserRole, HospitalProfile, ProfessionalProfile } from './user'

export interface TokenPayload {
  sub: string
  role: UserRole
  iat: number
  exp: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: Pick<User, 'id' | 'email' | 'role' | 'status'>
}

export interface RegisterHospitalRequest {
  email: string
  password: string
  name: string
  cnpj: string
  phone: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}

export interface RegisterProfessionalRequest {
  email: string
  password: string
  name: string
  cpf: string
  phone: string
  councilType: 'CRM' | 'COREN'
  councilNumber: string
  councilState: string
  specialtyIds: string[]
}

export interface MeResponse {
  user: User & {
    hospitalProfile?: HospitalProfile
    professionalProfile?: ProfessionalProfile
  }
}
