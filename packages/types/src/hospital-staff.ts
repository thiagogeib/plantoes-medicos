import type { HospitalProfile, ProfessionalProfile } from './user'

export type StaffStatus = 'INVITED' | 'ACTIVE' | 'INACTIVE'
export type StaffType = 'FIXO' | 'AVULSO'

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
  type: StaffType
  hourBankMinutes: number
  availableDaysOff: number
  invitedAt: string
  joinedAt?: string
  createdAt: string
  updatedAt: string
}

export interface InviteStaffRequest {
  cpf: string
  type?: StaffType
}

export interface RespondInviteRequest {
  accept: boolean
}

export interface UpdateStaffTypeRequest {
  type: StaffType
}

export interface AdjustBalanceRequest {
  hourBankMinutes?: number
  availableDaysOff?: number
}
