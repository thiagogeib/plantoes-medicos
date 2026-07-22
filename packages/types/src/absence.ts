import type { ProfessionalProfile } from './user'

export type AbsenceType = 'ATESTADO' | 'LICENCA' | 'OUTRO'

export interface Absence {
  id: string
  hospitalId: string
  hospital?: { id: string; name: string }
  professionalId: string
  professional?: Pick<ProfessionalProfile, 'id' | 'name' | 'councilType' | 'councilNumber'>
  type: AbsenceType
  startDate: string
  endDate: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface CreateAbsencePayload {
  hospitalId: string
  type: AbsenceType
  startDate: string
  endDate: string
  note?: string
}

export interface CreateAbsenceForStaffPayload {
  professionalId: string
  type: AbsenceType
  startDate: string
  endDate: string
  note?: string
}
