export interface ScheduleStatusShift {
  id: string
  title: string
  startTime: string
  endTime: string
  status: string
  slots: number
  filledSlots: number
  specialty?: { id: string; name: string }
}

export interface ScheduleStatusSwap {
  id: string
  shift: { id: string; title: string; startTime: string; endTime: string }
  from: { id: string; name: string } | null
  to: { id: string; name: string } | null
}

export interface ScheduleStatusLeave {
  id: string
  shift: { id: string; title: string; startTime: string; endTime: string }
  professional: { id: string; name: string }
  status: string
  covered: boolean
  coveredBy: { id: string; name: string } | null
}

export interface ScheduleStatusAbsence {
  id: string
  type: string
  startDate: string
  endDate: string
  note?: string
  professional: { id: string; name: string }
}

export interface ScheduleStatus {
  date: string
  shifts: ScheduleStatusShift[]
  swaps: ScheduleStatusSwap[]
  leaves: ScheduleStatusLeave[]
  absences: ScheduleStatusAbsence[]
}
