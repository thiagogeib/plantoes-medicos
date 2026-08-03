export type NotificationType =
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED'
  | 'NEW_APPLICATION'
  | 'SWAP_INTEREST'
  | 'SWAP_APPROVED'
  | 'SWAP_REJECTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'LEAVE_COVER_INTEREST'
  | 'LEAVE_COVERED'
  | 'LEAVE_CANCELLATION_REQUESTED'
  | 'LEAVE_CANCELLATION_DECIDED'
  | 'LEAVE_REQUEST_OPENED'
  | 'LEAVE_REQUEST_EXPIRED'
  | 'APPLICATION_PENDING_CONFIRMATION'
  | 'APPLICATION_CONFIRMED'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string | null
  read: boolean
  createdAt: string
}
