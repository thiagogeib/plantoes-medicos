import type { Specialty, HospitalProfile } from './user'

export type ShiftStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED'

export type CompensationType = 'MONEY' | 'HOUR_BANK' | 'OTHER'

export type CouncilType = 'CRM' | 'COREN'

export interface Shift {
  id: string
  hospitalId: string
  hospital?: Pick<HospitalProfile, 'name' | 'city' | 'state'> & { latitude?: number | null; longitude?: number | null }
  specialtyId: string
  specialty?: Specialty
  requiredCouncilType: CouncilType
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  location: string
  slots: number
  filledSlots: number
  status: ShiftStatus
  compensationType: CompensationType
  compensationNote?: string
  coverageForAbsenceId?: string
  coverageForAbsence?: {
    id: string
    type: string
    professional: { id: string; name: string }
  }
  distanceKm?: number
  _count?: { applications: number }
  createdAt: string
  updatedAt: string
}

export interface CreateShiftRequest {
  title: string
  description: string
  specialtyId: string
  requiredCouncilType: CouncilType
  date: string
  startTime: string
  endTime: string
  location: string
  slots: number
  compensationType: CompensationType
  compensationNote?: string
  coverageForAbsenceId?: string
}

export interface UpdateShiftRequest {
  title?: string
  description?: string
  specialtyId?: string
  requiredCouncilType?: CouncilType
  date?: string
  startTime?: string
  endTime?: string
  location?: string
  slots?: number
  status?: ShiftStatus
  compensationType?: CompensationType
  compensationNote?: string
  coverageForAbsenceId?: string
}

export interface ShiftFilters {
  specialtyId?: string
  city?: string
  state?: string
  dateFrom?: string
  dateTo?: string
  status?: ShiftStatus
  requiredCouncilType?: CouncilType
  raioKm?: number
  diaSemana?: number
  hasCandidates?: boolean
  page?: number
  limit?: number
}

export type Turno = 'MANHA' | 'TARDE' | 'NOITE'

export interface PublicShiftFilters {
  specialtyId?: string
  city?: string
  compensationType?: CompensationType
  requiredCouncilType?: CouncilType
  turno?: Turno
  page?: number
  limit?: number
}

export interface PublicStats {
  hospitals: number
  professionals: number
  shiftsFilled: number
  openShifts: number
}
