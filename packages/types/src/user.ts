export type UserRole = 'HOSPITAL' | 'PROFESSIONAL' | 'ADMIN'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION'

export interface User {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface Address {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}

export interface HospitalProfile {
  id: string
  userId: string
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
  createdAt: string
  updatedAt: string
}

export interface ProfessionalProfile {
  id: string
  userId: string
  name: string
  cpf: string
  phone: string
  councilType: 'CRM' | 'COREN'
  councilNumber: string
  councilState: string
  specialties: Specialty[]
  createdAt: string
  updatedAt: string
}

export interface Specialty {
  id: string
  name: string
}
