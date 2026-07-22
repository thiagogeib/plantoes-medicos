'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PlantaoStatusBadge } from '@/components/shared/plantao/PlantaoStatusBadge'
import type { Shift, Application, ApiResponse, ApiError } from '@plantoes-medicos/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, MapPin, Clock, Users, Building2 } from 'lucide-react'
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
import { compensationLabels } from '@/lib/compensation'

export default function PlantaoDetailProfissionalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [shift, setShift] = useState<Shift | null>(null)
  const [myApplication, setMyApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [applyOpen, setApplyOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)
  const [swapReason, setSwapReason] = useState('')
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveReason, setLeaveReason] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const shiftRes = await apiClient.get<ApiResponse<Shift>>(`/shifts/${id}`)
        setShift(shiftRes.data)
        try {
          const appsRes = await apiClient.get<{ data: Application[] }>('/applications/me')
          const mine = appsRes.data.find((a) => a.shiftId === id) ?? null
          setMyApplication(mine)
        } catch {}
      } catch {
        toast.error('Erro ao carregar plantão')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleApply() {
    setSubmitting(true)
    try {
      const res = await apiClient.post<ApiResponse<Application>>(
        `/shifts/${id}/applications`,
        { message: message || undefined }
      )
      setMyApplication(res.data)
      toast.success('Candidatura enviada!')
      setApplyOpen(false)
    } catch {
      toast.error('Erro ao se candidatar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleWithdraw() {
    if (!myApplication) return
    setSubmitting(true)
    try {
      await apiClient.patch(`/applications/${myApplication.id}/withdraw`, {})
      setMyApplication((prev) => prev ? { ...prev, status: 'WITHDRAWN' } : prev)
      toast.success('Candidatura retirada')
    } catch {
      toast.error('Erro ao retirar candidatura')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOfferSwap() {
    setSubmitting(true)
    try {
      await apiClient.post('/shift-swaps', { shiftId: id, reason: swapReason || undefined })
      toast.success('Plantão oferecido para troca')
      setSwapOpen(false)
      setSwapReason('')
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao oferecer plantão para troca')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestLeave() {
    setSubmitting(true)
    try {
      await apiClient.post('/leave-requests', { shiftId: id, reason: leaveReason || undefined })
      toast.success('Solicitação de folga enviada ao coordenador')
      setLeaveOpen(false)
      setLeaveReason('')
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao solicitar folga')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!shift) return null

  const canApply = !myApplication || myApplication.status === 'WITHDRAWN'
  const canWithdraw = myApplication?.status === 'PENDING'

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl">{shift.title}</CardTitle>
            <PlantaoStatusBadge status={shift.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-slate-600">{shift.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                {format(new Date(shift.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} — {shift.startTime} às {shift.endTime}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{shift.location}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="h-4 w-4 shrink-0" />
              <span>{shift.filledSlots}/{shift.slots} vagas preenchidas</span>
            </div>
            {shift.hospital && (
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>{shift.hospital.name} — {shift.hospital.city}/{shift.hospital.state}</span>
              </div>
            )}
          </div>

          <div>
            <Badge variant="outline">{compensationLabels[shift.compensationType]}</Badge>
            {shift.compensationType === 'OTHER' && shift.compensationNote && (
              <p className="text-sm text-slate-500 mt-1.5">{shift.compensationNote}</p>
            )}
          </div>

          {myApplication && myApplication.status !== 'WITHDRAWN' && (
            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 text-sm">
              <span className="font-medium">Sua candidatura: </span>
              <span className={
                myApplication.status === 'ACCEPTED' ? 'text-emerald-600 font-semibold' :
                myApplication.status === 'REJECTED' ? 'text-red-500 font-semibold' :
                'text-amber-600 font-semibold'
              }>
                {myApplication.status === 'ACCEPTED' ? 'Aceita' :
                 myApplication.status === 'REJECTED' ? 'Recusada' : 'Pendente'}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            {shift.status === 'OPEN' && canApply && (
              <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
                <DialogTrigger asChild>
                  <Button>Candidatar-se</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enviar candidatura</DialogTitle>
                    <DialogDescription>
                      Deixe uma mensagem opcional para o hospital (apresentação, experiência, etc.)
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    placeholder="Mensagem opcional..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancelar</Button>
                    <Button onClick={handleApply} disabled={submitting}>
                      {submitting ? 'Enviando...' : 'Confirmar candidatura'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {canWithdraw && (
              <Button variant="outline" onClick={handleWithdraw} disabled={submitting}>
                {submitting ? 'Retirando...' : 'Retirar candidatura'}
              </Button>
            )}

            {myApplication?.status === 'ACCEPTED' && (
              <>
                <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Oferecer para troca</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Oferecer plantão para troca</DialogTitle>
                      <DialogDescription>
                        Outros profissionais do quadro deste hospital poderão manifestar interesse. O coordenador aprova a troca antes de efetivá-la.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="Motivo (opcional)..."
                      value={swapReason}
                      onChange={(e) => setSwapReason(e.target.value)}
                      rows={3}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSwapOpen(false)}>Cancelar</Button>
                      <Button onClick={handleOfferSwap} disabled={submitting}>
                        {submitting ? 'Enviando...' : 'Confirmar oferta'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Solicitar folga</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Solicitar folga neste plantão</DialogTitle>
                      <DialogDescription>
                        O coordenador avalia a solicitação e, se aprovada, abre o plantão para cobertura por outro profissional do quadro.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="Motivo (opcional)..."
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      rows={3}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancelar</Button>
                      <Button onClick={handleRequestLeave} disabled={submitting}>
                        {submitting ? 'Enviando...' : 'Confirmar solicitação'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
