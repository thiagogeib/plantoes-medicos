import type { HospitalProfile, ProfessionalProfile } from './user'

export type StaffStatus = 'INVITED' | 'ACTIVE' | 'INACTIVE'

export interface HospitalStaff {
  id: string
  hospitalId: string
  hospital?: Pick<HospitalProfile, 'id' | 'name' | 'city' | 'state'>
  professionalId: string
  professional?: Pick<
    ProfessionalProfile,
    'id' | 'name' | 'cpf' | 'phone' | 'councilType' | 'councilNumber' | 'councilState'
  >
  status: StaffStatus
  hourBankMinutes: number
  availableDaysOff: number
  invitedAt: string
  joinedAt?: string
  createdAt: string
  updatedAt: string
}

export interface InviteStaffRequest {
  cpf: string
}

export interface RespondInviteRequest {
  accept: boolean
}

export interface AdjustBalanceRequest {
  hourBankMinutes?: number
  availableDaysOff?: number
}
