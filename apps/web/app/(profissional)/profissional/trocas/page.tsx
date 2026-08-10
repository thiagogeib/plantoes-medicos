'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { formatDateOnly } from '@/lib/date-utils'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Building2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ShiftSwapRequest, SwapRequestStatus, Application, ApiError } from '@plantoes-medicos/types'

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
        <span>{formatDateOnly(swap.shift.date)} — {swap.shift.startTime}–{swap.shift.endTime}</span>
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
  const [mine, setMine] = useState<ShiftSwapRequest[]>([])
  const [acceptedApplications, setAcceptedApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedShiftId, setSelectedShiftId] = useState('')
  const [reason, setReason] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [mineRes, applicationsRes] = await Promise.all([
        apiClient.get<{ data: ShiftSwapRequest[] }>('/shift-swaps/mine'),
        apiClient.get<{ data: Application[] }>('/applications/me'),
      ])
      setMine(mineRes.data)
      setAcceptedApplications(applicationsRes.data.filter((a) => a.status === 'ACCEPTED'))
    } catch {
      toast.error('Erro ao carregar trocas de plantão')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate() {
    if (!selectedShiftId) {
      toast.error('Selecione um plantão')
      return
    }
    setCreating(true)
    try {
      await apiClient.post('/shift-swaps', { shiftId: selectedShiftId, reason: reason || undefined })
      toast.success('Plantão oferecido para troca')
      setCreateOpen(false)
      setSelectedShiftId('')
      setReason('')
      void load()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao oferecer plantão para troca')
    } finally {
      setCreating(false)
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trocas de Plantão</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Ofereça um plantão aceito para troca. Plantões de colegas oferecidos para troca aparecem
            em <strong>Buscar Plantões</strong>, junto com os demais.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Oferecer plantão para troca
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Oferecer plantão para troca</DialogTitle>
              <DialogDescription>
                Escolha um plantão que você já teve aceito. Outros profissionais do quadro do mesmo hospital poderão manifestar interesse, e o coordenador aprova a troca.
              </DialogDescription>
            </DialogHeader>
            {acceptedApplications.length === 0 ? (
              <p className="text-sm text-slate-500">
                Você ainda não tem nenhum plantão aceito para oferecer em troca.
              </p>
            ) : (
              <>
                <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plantão" />
                  </SelectTrigger>
                  <SelectContent>
                    {acceptedApplications.map((a) => (
                      <SelectItem key={a.shiftId} value={a.shiftId}>
                        {a.shift?.title} — {a.shift?.date && formatDateOnly(a.shift.date)} ({a.shift?.startTime}–{a.shift?.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Motivo (opcional)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating || acceptedApplications.length === 0}>
                {creating ? 'Enviando...' : 'Confirmar oferta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
