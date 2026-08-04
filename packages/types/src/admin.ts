export interface PlatformMetrics {
  totalHospitals: number
  totalProfessionals: number
  totalShifts: number
  openShifts: number
  filledShifts: number
  cancelledShifts: number
  totalApplications: number
  fillRate: number
}

export interface RiskShift {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  specialty?: { id: string; name: string }
  hospital?: { id: string; name: string; city: string; state: string }
}

export type ActivityEventType = 'SHIFT' | 'APPLICATION' | 'SWAP' | 'LEAVE'

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  summary: string
  at: string
}
