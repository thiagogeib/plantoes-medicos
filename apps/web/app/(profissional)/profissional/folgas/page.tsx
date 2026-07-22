'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Building2, CalendarOff } from 'lucide-react'
import type { LeaveRequest, LeaveRequestStatus } from '@plantoes-medicos/types'

const statusLabel: Record<LeaveRequestStatus, string> = {
  PENDING: 'Aguardando coordenador',
  APPROVED_PENDING_COVERAGE: 'Aprovada — aguardando cobertura',
  COVERED: 'Coberta',
  REJECTED: 'Recusada',
  CANCELLED: 'Cancelada',
}

const statusVariant: Record<LeaveRequestStatus, 'warning' | 'success' | 'secondary' | 'destructive'> = {
  PENDING: 'warning',
  APPROVED_PENDING_COVERAGE: 'warning',
  COVERED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
}

function LeaveShiftInfo({ leave }: { leave: LeaveRequest }) {
  if (!leave.shift) return null
  return (
    <div className="space-y-1">
      <div className="font-semibold text-slate-900">{leave.shift.title}</div>
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        <span>{format(new Date(leave.shift.date), 'dd/MM/yyyy', { locale: ptBR })} — {leave.shift.startTime}–{leave.shift.endTime}</span>
      </div>
      {leave.shift.hospital && (
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Building2 className="h-3.5 w-3.5" />
          <span>{leave.shift.hospital.name}</span>
        </div>
      )}
    </div>
  )
}

export default function FolgasProfissionalPage() {
  const [available, setAvailable] = useState<LeaveRequest[]>([])
  const [mine, setMine] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [availableRes, mineRes] = await Promise.all([
        apiClient.get<{ data: LeaveRequest[] }>('/leave-requests/available'),
        apiClient.get<{ data: LeaveRequest[] }>('/leave-requests/mine'),
      ])
      setAvailable(availableRes.data)
      setMine(mineRes.data)
    } catch {
      toast.error('Erro ao carregar folgas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleInterest(id: string) {
    setBusyId(id)
    try {
      await apiClient.post(`/leave-requests/${id}/interest`, {})
      toast.success('Interesse em cobrir registrado! O coordenador foi notificado.')
      void load()
    } catch {
      toast.error('Erro ao manifestar interesse')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancel(id: string) {
    setBusyId(id)
    try {
      await apiClient.patch(`/leave-requests/${id}/cancel`, {})
      toast.success('Solicitação de folga cancelada')
      void load()
    } catch {
      toast.error('Erro ao cancelar solicitação')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Folgas</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Solicite folga em um plantão já aceito, ou cubra a folga de um colega. Consulte seu saldo em{' '}
          <span className="font-medium">Meus Hospitais</span>.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Disponíveis para cobertura</h2>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : available.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-slate-400">Nenhuma folga aguardando cobertura no momento.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {available.map((leave) => (
              <Card key={leave.id}>
                <CardContent className="p-5 flex items-start justify-between gap-4 flex-wrap">
                  <LeaveShiftInfo leave={leave} />
                  <Button size="sm" onClick={() => handleInterest(leave.id)} disabled={busyId === leave.id}>
                    <CalendarOff className="mr-2 h-4 w-4" /> Cobrir plantão
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Minhas solicitações</h2>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : mine.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-slate-400">Você ainda não solicitou nenhuma folga.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {mine.map((leave) => (
              <Card key={leave.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <LeaveShiftInfo leave={leave} />
                    <Badge variant={statusVariant[leave.status]}>{statusLabel[leave.status]}</Badge>
                  </div>
                  {leave.status === 'PENDING' && (
                    <Button size="sm" variant="outline" onClick={() => handleCancel(leave.id)} disabled={busyId === leave.id}>
                      Cancelar solicitação
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
