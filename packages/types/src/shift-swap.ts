import type { Shift } from './shift'
import type { ProfessionalProfile } from './user'

export type SwapRequestStatus = 'OPEN' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type SwapInterestStatus = 'PENDING' | 'SELECTED' | 'REJECTED'

type ProfessionalSummary = Pick<ProfessionalProfile, 'id' | 'name' | 'councilType' | 'councilNumber'> & {
  phone?: string
}

export interface ShiftSwapInterest {
  id: string
  swapRequestId: string
  professionalId: string
  professional?: ProfessionalSummary
  status: SwapInterestStatus
  createdAt: string
  updatedAt: string
}

export interface ShiftSwapRequest {
  id: string
  shiftId: string
  shift?: Pick<Shift, 'id' | 'title' | 'date' | 'startTime' | 'endTime' | 'location' | 'specialty' | 'hospital'>
  requestingProfessionalId: string
  requestingProfessional?: Pick<ProfessionalProfile, 'id' | 'name' | 'councilType' | 'councilNumber'>
  status: SwapRequestStatus
  reason?: string
  selectedInterestId?: string
  interests: ShiftSwapInterest[]
  createdAt: string
  updatedAt: string
}

export interface CreateSwapRequestPayload {
  shiftId: string
  reason?: string
}

export interface ApproveSwapPayload {
  interestId: string
}
