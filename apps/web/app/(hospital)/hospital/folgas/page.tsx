'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Users } from 'lucide-react'
import type { LeaveRequest, LeaveRequestStatus } from '@plantoes-medicos/types'

const statusLabel: Record<LeaveRequestStatus, string> = {
  PENDING: 'Aguardando avaliação',
  APPROVED_PENDING_COVERAGE: 'Vaga aberta — aguardando candidatos',
  CANCELLATION_REQUESTED: 'Profissional pediu cancelamento',
  COVERED: 'Coberta',
  REJECTED: 'Recusada',
  CANCELLED: 'Cancelada',
}

const statusVariant: Record<LeaveRequestStatus, 'warning' | 'success' | 'secondary' | 'destructive'> = {
  PENDING: 'warning',
  APPROVED_PENDING_COVERAGE: 'warning',
  CANCELLATION_REQUESTED: 'warning',
  COVERED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
}

export default function FolgasHospitalPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<{ data: LeaveRequest[] }>('/leave-requests/hospital')
      setLeaves(res.data)
    } catch {
      toast.error('Erro ao carregar solicitações de folga')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleApproveCancellation(id: string) {
    setBusyId(id)
    try {
      await apiClient.patch(`/leave-requests/${id}/approve-cancellation`, {})
      toast.success('Cancelamento aprovado — folga não vai mais acontecer')
      void load()
    } catch {
      toast.error('Erro ao aprovar cancelamento')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRejectCancellation(id: string) {
    setBusyId(id)
    try {
      await apiClient.patch(`/leave-requests/${id}/reject-cancellation`, {})
      toast.success('Pedido de cancelamento recusado — folga continua valendo')
      void load()
    } catch {
      toast.error('Erro ao recusar cancelamento')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Folgas</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Cada folga abre automaticamente uma vaga de cobertura. Aceite candidatos normalmente pela
          tela do plantão — assim que a confirmação (com pagamento) for concluída, a folga é efetivada.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : leaves.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">Nenhuma solicitação de folga até o momento.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {leaves.map((leave) => {
            const isLong = (leave.shift?.hospital?.longLeaveThresholdMinutes ?? Infinity) <= leave.durationMinutes
            const candidatos = leave.shift?.applications?.length ?? 0
            return (
              <Card key={leave.id}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900">{leave.shift?.title}</div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {leave.shift && format(new Date(leave.shift.date), 'dd/MM/yyyy', { locale: ptBR })} — {leave.shift?.startTime}–{leave.shift?.endTime}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500">
                        Solicitante: <span className="font-medium text-slate-700">{leave.professional?.name}</span>
                        {' — '}{Math.round((leave.durationMinutes / 60) * 10) / 10}h de folga
                      </div>
                      {leave.reason && <p className="text-sm text-slate-500 italic">"{leave.reason}"</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={statusVariant[leave.status]}>{statusLabel[leave.status]}</Badge>
                      {isLong && <Badge variant="outline">Folga longa</Badge>}
                    </div>
                  </div>

                  {leave.status === 'CANCELLATION_REQUESTED' && (
                    <div className="flex gap-2 border-t border-slate-100 pt-4">
                      <Button size="sm" onClick={() => handleApproveCancellation(leave.id)} disabled={busyId === leave.id}>
                        Aprovar cancelamento
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectCancellation(leave.id)}
                        disabled={busyId === leave.id}
                      >
                        Recusar — manter folga
                      </Button>
                    </div>
                  )}

                  {(leave.status === 'APPROVED_PENDING_COVERAGE' || leave.status === 'CANCELLATION_REQUESTED') && (
                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>{candidatos} candidatura(s) recebidas</span>
                      </div>
                      <Link href={`/hospital/plantoes/${leave.shiftId}`}>
                        <Button size="sm" variant="outline">Ver vaga e candidatos</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
