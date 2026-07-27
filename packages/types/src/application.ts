import type { Shift } from './shift'
import type { ProfessionalProfile } from './user'

export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'

export interface Application {
  id: string
  shiftId: string
  shift?: Pick<Shift, 'hospitalId' | 'title' | 'date' | 'startTime' | 'endTime' | 'location' | 'hospital'>
  professionalId: string
  professional?: Pick<ProfessionalProfile, 'name' | 'councilType' | 'councilNumber' | 'specialties'>
  status: ApplicationStatus
  message?: string
  createdAt: string
  updatedAt: string
}

export interface CreateApplicationRequest {
  message?: string
}

export interface UpdateApplicationStatusRequest {
  status: 'ACCEPTED' | 'REJECTED'
}
