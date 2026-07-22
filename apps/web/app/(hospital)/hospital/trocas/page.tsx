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
import { Clock } from 'lucide-react'
import type { ShiftSwapRequest, SwapRequestStatus } from '@plantoes-medicos/types'

const statusLabel: Record<SwapRequestStatus, string> = {
  OPEN: 'Aberta',
  PENDING_APPROVAL: 'Aguardando aprovação',
  APPROVED: 'Aprovada',
  REJECTED: 'Recusada',
  CANCELLED: 'Cancelada',
}

const statusVariant: Record<SwapRequestStatus, 'warning' | 'success' | 'secondary' | 'destructive'> = {
  OPEN: 'warning',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
}

export default function TrocasHospitalPage() {
  const [swaps, setSwaps] = useState<ShiftSwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<{ data: ShiftSwapRequest[] }>('/shift-swaps/hospital')
      setSwaps(res.data)
    } catch {
      toast.error('Erro ao carregar trocas de plantão')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleApprove(swapId: string, interestId: string) {
    setBusyId(swapId)
    try {
      await apiClient.patch(`/shift-swaps/${swapId}/approve`, { interestId })
      toast.success('Troca aprovada e efetivada')
      void load()
    } catch {
      toast.error('Erro ao aprovar troca')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(swapId: string) {
    setBusyId(swapId)
    try {
      await apiClient.patch(`/shift-swaps/${swapId}/reject`, {})
      toast.success('Solicitação de troca recusada')
      void load()
    } catch {
      toast.error('Erro ao recusar troca')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Trocas de Plantão</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Aprove ou recuse solicitações de troca entre profissionais do seu quadro.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : swaps.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">Nenhuma solicitação de troca até o momento.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {swaps.map((swap) => (
            <Card key={swap.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900">{swap.shift?.title}</div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {swap.shift && format(new Date(swap.shift.date), 'dd/MM/yyyy', { locale: ptBR })} — {swap.shift?.startTime}–{swap.shift?.endTime}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      Oferecido por: <span className="font-medium text-slate-700">{swap.requestingProfessional?.name}</span>
                    </div>
                    {swap.reason && <p className="text-sm text-slate-500 italic">"{swap.reason}"</p>}
                  </div>
                  <Badge variant={statusVariant[swap.status]}>{statusLabel[swap.status]}</Badge>
                </div>

                {swap.status === 'OPEN' && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      Interessados ({swap.interests.length})
                    </p>
                    {swap.interests.length === 0 ? (
                      <p className="text-sm text-slate-400">Nenhum profissional manifestou interesse ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {swap.interests.map((interest) => (
                          <div key={interest.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                            <div className="text-sm">
                              <span className="font-medium text-slate-800">{interest.professional?.name}</span>
                              <span className="text-slate-400"> — {interest.professional?.councilType} {interest.professional?.councilNumber}</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(swap.id, interest.id)}
                              disabled={busyId === swap.id}
                            >
                              Aprovar troca
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-200 hover:bg-red-50 mt-1"
                          onClick={() => handleReject(swap.id)}
                          disabled={busyId === swap.id}
                        >
                          Recusar solicitação
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
