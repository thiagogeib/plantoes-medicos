import { type FC } from 'react'
import { Badge } from '@/components/ui/badge'
import type { ShiftStatus } from '@plantoes-medicos/types'

interface PlantaoStatusBadgeProps {
  status: ShiftStatus
}

const statusConfig: Record<
  ShiftStatus,
  { label: string; variant: 'success' | 'default' | 'destructive' | 'slate' }
> = {
  OPEN: { label: 'Aberto', variant: 'success' },
  FILLED: { label: 'Preenchido', variant: 'default' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  COMPLETED: { label: 'Concluído', variant: 'slate' },
}

export const PlantaoStatusBadge: FC<PlantaoStatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
