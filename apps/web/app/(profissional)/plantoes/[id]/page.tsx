'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Calendar, Clock, MapPin, Users, Building2, ChevronLeft } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { PlantaoStatusBadge } from '@/components/shared/plantao/PlantaoStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Shift, Application, ApiResponse, ApiListResponse, ApiError } from '@plantoes-medicos/types'

export default function ProfissionalPlantaoDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [shift, setShift] = useState<Shift | null>(null)
  const [myApplication, setMyApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [applying, setApplying] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [shiftRes, appsRes] = await Promise.all([
        apiClient.get<ApiResponse<Shift>>(`/shifts/${params.id}`),
        apiClient.get<ApiListResponse<Application>>('/applications/me?limit=100'),
      ])
      setShift(shiftRes.data)
      const found = appsRes.data.find((a) => a.shiftId === params.id) ?? null
      setMyApplication(found)
    } catch {
      toast.error('Erro ao carregar plantão')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void load()
  }, [load])

  const handleApply = async () => {
    setApplying(true)
    try {
      await apiClient.post(`/shifts/${params.id}/applications`, { message: message || undefined })
      toast.success('Candidatura enviada com sucesso')
      setApplyDialogOpen(false)
      setMessage('')
      void load()
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao enviar candidatura')
    } finally {
      setApplying(false)
    }
  }

  const handleWithdraw = async () => {
    if (!myApplication) return
    setWithdrawing(true)
    try {
      await apiClient.patch(`/applications/${myApplication.id}/withdraw`)
      toast.success('Candidatura retirada')
      void load()
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao retirar candidatura')
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (!shift) {
    return <div className="text-center py-16 text-slate-400">Plantão não encontrado.</div>
  }

  const canApply = shift.status === 'OPEN' && !myApplication
  const alreadyApplied = !!myApplication && myApplication.status !== 'WITHDRAWN'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Voltar">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{shift.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <PlantaoStatusBadge status={shift.status} />
            {shift.specialty && (
              <Badge variant="secondary">{shift.specialty.name}</Badge>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do plantão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {shift.hospital && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="font-medium">{shift.hospital.name}</span>
              <span className="text-slate-400">—</span>
              <span>{shift.hospital.city}/{shift.hospital.state}</span>
            </div>
          )}

          <p className="text-sm text-slate-600">{shift.description}</p>

          <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>{format(parseISO(shift.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{shift.startTime} – {shift.endTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>{shift.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span>{shift.filledSlots}/{shift.slots} vagas</span>
            </div>
          </div>

          <div className="pt-2">
            {canApply && (
              <Button onClick={() => setApplyDialogOpen(true)} className="w-full sm:w-auto">
                Candidatar-se a este plantão
              </Button>
            )}
            {alreadyApplied && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Badge
                  variant={
                    myApplication!.status === 'ACCEPTED'
                      ? 'success'
                      : myApplication!.status === 'REJECTED'
                        ? 'destructive'
                        : 'warning'
                  }
                >
                  {myApplication!.status === 'PENDING' && 'Candidatura enviada — aguardando'}
                  {myApplication!.status === 'ACCEPTED' && 'Candidatura aceita'}
                  {myApplication!.status === 'REJECTED' && 'Candidatura recusada'}
                </Badge>
                {myApplication!.status === 'PENDING' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                  >
                    {withdrawing ? 'Retirando...' : 'Retirar candidatura'}
                  </Button>
                )}
              </div>
            )}
            {shift.status !== 'OPEN' && !myApplication && (
              <p className="text-sm text-slate-400">
                Este plantão não está mais aceitando candidaturas.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar candidatura</DialogTitle>
            <DialogDescription>
              Você está se candidatando para <strong>{shift.title}</strong>. Adicione uma mensagem
              opcional.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Mensagem para o hospital (opcional)..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApply} disabled={applying}>
              {applying ? 'Enviando...' : 'Confirmar candidatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
