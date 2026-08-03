import type { Shift } from './shift'
import type { ProfessionalProfile } from './user'
import type { Application } from './application'

export type LeaveRequestStatus =
  | 'PENDING'
  | 'APPROVED_PENDING_COVERAGE'
  | 'CANCELLATION_REQUESTED'
  | 'COVERED'
  | 'REJECTED'
  | 'CANCELLED'

export interface LeaveRequest {
  id: string
  shiftId: string
  shift?: Pick<Shift, 'id' | 'title' | 'date' | 'startTime' | 'endTime' | 'location' | 'specialty' | 'hospital'> & {
    applications?: (Pick<Application, 'id' | 'status'> & {
      professional?: Pick<ProfessionalProfile, 'id' | 'name' | 'councilType' | 'councilNumber'>
    })[]
    hospital?: Shift['hospital'] & {
      leaveCoverageDeadlineDays?: number
      longLeaveThresholdMinutes?: number
    }
  }
  professionalId: string
  professional?: Pick<ProfessionalProfile, 'id' | 'name' | 'councilType' | 'councilNumber'>
  date: string
  durationMinutes: number
  reason?: string
  status: LeaveRequestStatus
  createdAt: string
  updatedAt: string
}

export interface CreateLeaveRequestPayload {
  hospitalId?: string
  specialtyId: string
  date: string
  startTime: string
  endTime: string
  reason?: string
}
