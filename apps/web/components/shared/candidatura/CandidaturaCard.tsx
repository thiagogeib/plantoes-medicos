import { type FC } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, MapPin, Building2, UserCircle, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { Application, ApplicationStatus } from '@plantoes-medicos/types'

interface CandidaturaCardProps {
  application: Application
  variant: 'hospital' | 'profissional'
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
  onConfirm?: (id: string) => void
  confirmLoading?: boolean
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

const applicationStatusConfig: Record<
  ApplicationStatus,
  { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' }
> = {
  PENDING: { label: 'Pendente', variant: 'warning' },
  PENDING_CONFIRMATION: { label: 'Aprovado — aguardando confirmação', variant: 'warning' },
  ACCEPTED: { label: 'Confirmado', variant: 'success' },
  REJECTED: { label: 'Recusado', variant: 'destructive' },
  WITHDRAWN: { label: 'Retirado', variant: 'secondary' },
}

export const CandidaturaCard: FC<CandidaturaCardProps> = ({
  application,
  variant,
  onAccept,
  onReject,
  onConfirm,
  confirmLoading,
  selectable,
  selected,
  onToggleSelect,
}) => {
  const statusConfig = applicationStatusConfig[application.status]

  if (variant === 'hospital') {
    const professional = application.professional
    return (
      <Card className={selected ? 'ring-2 ring-primary' : undefined}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {selectable && application.status === 'PENDING' && (
                  <Checkbox
                    checked={!!selected}
                    onCheckedChange={onToggleSelect}
                    aria-label="Selecionar candidato"
                  />
                )}
                <UserCircle className="h-5 w-5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-900 truncate">
                  {professional?.name ?? 'Profissional'}
                </span>
              </div>
              {professional && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-2">
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span>
                    {professional.councilType} {professional.councilNumber}
                  </span>
                </div>
              )}
              {professional?.specialties && professional.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {professional.specialties.map((s) => (
                    <Badge key={s.id} variant="secondary" className="text-xs">
                      {s.name}
                    </Badge>
                  ))}
                </div>
              )}
              {application.message && (
                <p className="text-sm text-slate-600 italic line-clamp-2">
                  &ldquo;{application.message}&rdquo;
                </p>
              )}
            </div>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>

          {(application.status === 'PENDING' || application.status === 'PENDING_CONFIRMATION') &&
            (onAccept || onReject) && (
            <div className="flex gap-2 mt-4">
              {onAccept && application.status === 'PENDING' && (
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => onAccept(application.id)}
                >
                  Aprovar
                </Button>
              )}
              {onReject && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => onReject(application.id)}
                >
                  Recusar
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const shift = application.shift
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="font-semibold text-slate-900 line-clamp-1">
            {shift?.title ?? 'Plantão'}
          </h4>
          <Badge variant={statusConfig.variant} className="shrink-0">
            {statusConfig.label}
          </Badge>
        </div>

        {application.status === 'REJECTED' && application.rejectionReason && (
          <p className="text-sm text-slate-500 italic mb-2">
            &ldquo;{application.rejectionReason}&rdquo;
          </p>
        )}

        {application.status === 'PENDING_CONFIRMATION' && (
          <p className="text-sm text-slate-600 mb-2">
            O hospital aprovou sua candidatura. Confirme e pague a taxa de confirmação para garantir a vaga.
          </p>
        )}

        {shift && (
          <div className="space-y-1.5 text-sm text-slate-500">
            {shift.hospital && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>{shift.hospital.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{format(parseISO(shift.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
              <span className="text-slate-300">•</span>
              <span>{shift.startTime}–{shift.endTime}</span>
            </div>
            {shift.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{shift.location}</span>
              </div>
            )}
          </div>
        )}

        {application.status === 'PENDING_CONFIRMATION' && onConfirm && (
          <div className="mt-4">
            <Button
              size="sm"
              className="w-full"
              onClick={() => onConfirm(application.id)}
              disabled={confirmLoading}
            >
              {confirmLoading ? 'Processando...' : 'Confirmar e pagar taxa'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
