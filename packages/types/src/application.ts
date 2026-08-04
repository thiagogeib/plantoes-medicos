import type { Shift } from './shift'
import type { ProfessionalProfile } from './user'

export type ApplicationStatus = 'PENDING' | 'PENDING_CONFIRMATION' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'

export type ChargeStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'

export interface Charge {
  id: string
  applicationId: string
  amountCents: number
  status: ChargeStatus
  paidAt?: string
  createdAt: string
  updatedAt: string
}

export interface Application {
  id: string
  shiftId: string
  shift?: Pick<Shift, 'hospitalId' | 'title' | 'date' | 'startTime' | 'endTime' | 'location' | 'hospital' | 'specialty' | 'slots' | 'filledSlots'>
  professionalId: string
  professional?: Pick<ProfessionalProfile, 'name' | 'councilType' | 'councilNumber' | 'councilState' | 'specialties'>
  status: ApplicationStatus
  message?: string
  rejectionReason?: string
  charge?: Charge
  createdAt: string
  updatedAt: string
}

export interface CreateApplicationRequest {
  message?: string
}

export interface UpdateApplicationStatusRequest {
  status: 'ACCEPTED' | 'REJECTED'
}

export interface ProfessionalMonthStats {
  month: string
  shiftsCount: number
  totalHours: number
  byCompensation: { MONEY: number; HOUR_BANK: number; OTHER: number }
}
