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
import { Clock, Building2, Repeat } from 'lucide-react'
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

function SwapShiftInfo({ swap }: { swap: ShiftSwapRequest }) {
  if (!swap.shift) return null
  return (
    <div className="space-y-1">
      <div className="font-semibold text-slate-900">{swap.shift.title}</div>
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        <span>{format(new Date(swap.shift.date), 'dd/MM/yyyy', { locale: ptBR })} — {swap.shift.startTime}–{swap.shift.endTime}</span>
      </div>
      {swap.shift.hospital && (
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Building2 className="h-3.5 w-3.5" />
          <span>{swap.shift.hospital.name}</span>
        </div>
      )}
    </div>
  )
}

export default function TrocasProfissionalPage() {
  const [available, setAvailable] = useState<ShiftSwapRequest[]>([])
  const [mine, setMine] = useState<ShiftSwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [availableRes, mineRes] = await Promise.all([
        apiClient.get<{ data: ShiftSwapRequest[] }>('/shift-swaps/available'),
        apiClient.get<{ data: ShiftSwapRequest[] }>('/shift-swaps/mine'),
      ])
      setAvailable(availableRes.data)
      setMine(mineRes.data)
    } catch {
      toast.error('Erro ao carregar trocas de plantão')
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
      await apiClient.post(`/shift-swaps/${id}/interest`, {})
      toast.success('Interesse registrado! O coordenador foi notificado.')
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
      await apiClient.patch(`/shift-swaps/${id}/cancel`, {})
      toast.success('Solicitação de troca cancelada')
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
        <h1 className="text-2xl font-bold text-slate-900">Trocas de Plantão</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Ofereça um plantão aceito para troca, ou manifeste interesse em cobrir a troca de um colega.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Disponíveis para troca</h2>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : available.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-slate-400">Nenhuma troca disponível no momento.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {available.map((swap) => (
              <Card key={swap.id}>
                <CardContent className="p-5 flex items-start justify-between gap-4 flex-wrap">
                  <SwapShiftInfo swap={swap} />
                  <Button size="sm" onClick={() => handleInterest(swap.id)} disabled={busyId === swap.id}>
                    <Repeat className="mr-2 h-4 w-4" /> Manifestar interesse
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
          <Card><CardContent className="py-8 text-center text-slate-400">Você ainda não ofereceu nenhum plantão para troca.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {mine.map((swap) => (
              <Card key={swap.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <SwapShiftInfo swap={swap} />
                    <Badge variant={statusVariant[swap.status]}>{statusLabel[swap.status]}</Badge>
                  </div>
                  {swap.interests.length > 0 && (
                    <p className="text-sm text-slate-500">
                      {swap.interests.length} profissional(is) manifestaram interesse.
                    </p>
                  )}
                  {swap.status === 'OPEN' && (
                    <Button size="sm" variant="outline" onClick={() => handleCancel(swap.id)} disabled={busyId === swap.id}>
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
