import type { Shift } from './shift'
import type { ProfessionalProfile } from './user'

export type LeaveRequestStatus =
  | 'PENDING'
  | 'APPROVED_PENDING_COVERAGE'
  | 'COVERED'
  | 'REJECTED'
  | 'CANCELLED'

export type LeaveCoverInterestStatus = 'PENDING' | 'SELECTED' | 'REJECTED'

type ProfessionalSummary = Pick<ProfessionalProfile, 'id' | 'name' | 'councilType' | 'councilNumber'> & {
  phone?: string
}

export interface LeaveCoverInterest {
  id: string
  leaveRequestId: string
  professionalId: string
  professional?: ProfessionalSummary
  status: LeaveCoverInterestStatus
  createdAt: string
  updatedAt: string
}

export interface LeaveRequest {
  id: string
  shiftId: string
  shift?: Pick<Shift, 'id' | 'title' | 'date' | 'startTime' | 'endTime' | 'location' | 'specialty' | 'hospital'>
  professionalId: string
  professional?: Pick<ProfessionalProfile, 'id' | 'name' | 'councilType' | 'councilNumber'>
  date: string
  reason?: string
  status: LeaveRequestStatus
  selectedCoverInterestId?: string
  coverInterests: LeaveCoverInterest[]
  createdAt: string
  updatedAt: string
}

export interface CreateLeaveRequestPayload {
  shiftId: string
  reason?: string
}

export interface SelectCoverPayload {
  interestId: string
}
