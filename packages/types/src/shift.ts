import type { Specialty, HospitalProfile } from './user'

export type ShiftStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED'

export type CompensationType = 'MONEY' | 'HOUR_BANK' | 'OTHER'

export interface Shift {
  id: string
  hospitalId: string
  hospital?: Pick<HospitalProfile, 'name' | 'city' | 'state'>
  specialtyId: string
  specialty?: Specialty
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
  createdAt: string
  updatedAt: string
}

export interface CreateShiftRequest {
  title: string
  description: string
  specialtyId: string
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
  page?: number
  limit?: number
}
