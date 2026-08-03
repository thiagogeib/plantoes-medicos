import { type FC } from 'react'
import { format, differenceInHours, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MapPin, Clock, Users, Building2, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PlantaoStatusBadge } from './PlantaoStatusBadge'
import { compensationLabels } from '@/lib/compensation'
import type { Shift } from '@plantoes-medicos/types'

interface PlantaoCardProps {
  shift?: Shift
  onApply?: () => void
  onViewCandidates?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onCancel?: () => void
  isSwapOffer?: boolean
  swapOfferedBy?: string
  applyDisabled?: boolean
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

const councilLabel: Record<string, string> = {
  CRM: 'Médico (CRM)',
  COREN: 'Enfermeiro (COREN)',
}

export const PlantaoCard: FC<PlantaoCardProps> = ({
  shift,
  onApply,
  onViewCandidates,
  onEdit,
  onDelete,
  onCancel,
  isSwapOffer,
  swapOfferedBy,
  applyDisabled,
  selectable,
  selected,
  onToggleSelect,
}) => {
  if (!shift) {
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    )
  }

  const shiftDate = parseISO(shift.date)
  const hoursUntilShift = differenceInHours(shiftDate, new Date())
  const isUrgent = hoursUntilShift < 48 && hoursUntilShift >= 0 && shift.status === 'OPEN'
  const fillPercent = shift.slots > 0 ? Math.round((shift.filledSlots / shift.slots) * 100) : 0

  return (
    <Card className={`hover:shadow-md transition-shadow ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1.5 items-center">
            {selectable && (
              <Checkbox
                checked={!!selected}
                onCheckedChange={onToggleSelect}
                className="mr-1"
                aria-label="Selecionar vaga"
              />
            )}
            {isSwapOffer ? (
              <Badge variant="warning">Disponível por troca</Badge>
            ) : (
              <PlantaoStatusBadge status={shift.status} />
            )}
            {isUrgent && !isSwapOffer && (
              <Badge variant="warning">Urgente</Badge>
            )}
            {shift.specialty && (
              <Badge variant="secondary">{shift.specialty.name}</Badge>
            )}
            {shift.requiredCouncilType && (
              <Badge variant="outline">{councilLabel[shift.requiredCouncilType]}</Badge>
            )}
          </div>
          {(onEdit || onDelete || onCancel) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir plantão
                  </DropdownMenuItem>
                )}
                {onCancel && (
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    onClick={onCancel}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Cancelar plantão
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{shift.title}</h3>

        {shift.hospital && (
          <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
            <Building2 className="h-4 w-4 shrink-0" />
            <span>{shift.hospital.name}</span>
            <span className="text-slate-300">•</span>
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{shift.hospital.city}</span>
            {typeof shift.distanceKm === 'number' && (
              <>
                <span className="text-slate-300">•</span>
                <span>{shift.distanceKm} km</span>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-600 mb-2">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>{format(shiftDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
            <span className="text-slate-400">•</span>
            <span>{shift.startTime}–{shift.endTime}</span>
          </div>
        </div>

        <div className="mb-4">
          <Badge variant="outline">{compensationLabels[shift.compensationType]}</Badge>
        </div>

        {isSwapOffer ? (
          <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-600">
            <Users className="h-4 w-4 text-slate-400" />
            <span>Oferecido por: {swapOfferedBy ?? 'outro profissional do quadro'}</span>
          </div>
        ) : (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <Users className="h-4 w-4 text-slate-400" />
                <span>{shift.filledSlots}/{shift.slots} vagas</span>
              </div>
              <span className="text-xs text-slate-400">{fillPercent}%</span>
            </div>
            <Progress value={fillPercent} className="h-1.5" />
          </div>
        )}

        {(onApply || onViewCandidates) && (
          <div className="flex gap-2 pt-1">
            {onApply && (
              <Button size="sm" onClick={onApply} disabled={applyDisabled} className="flex-1">
                Candidatar-se
              </Button>
            )}
            {onViewCandidates && (
              <Button size="sm" variant="outline" onClick={onViewCandidates} className="flex-1">
                Ver candidatos
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
