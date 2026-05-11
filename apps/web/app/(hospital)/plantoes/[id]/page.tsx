'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Calendar, Clock, MapPin, Users, ChevronLeft, AlertTriangle } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { PlantaoStatusBadge } from '@/components/shared/plantao/PlantaoStatusBadge'
import { CandidaturaCard } from '@/components/shared/candidatura/CandidaturaCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type {
  Shift,
  Application,
  ApiResponse,
  ApiListResponse,
  ApiError,
} from '@plantoes-medicos/types'

export default function HospitalPlantaoDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [shift, setShift] = useState<Shift | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    try {
      const [shiftRes, appsRes] = await Promise.all([
        apiClient.get<ApiResponse<Shift>>(`/shifts/${params.id}`),
        apiClient.get<ApiListResponse<Application>>(`/shifts/${params.id}/applications`),
      ])
      setShift(shiftRes.data)
      setApplications(appsRes.data)
    } catch {
      toast.error('Erro ao carregar plantão')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void load()
  }, [load])

  const handleAccept = async (applicationId: string) => {
    try {
      await apiClient.patch(`/applications/${applicationId}/status`, { status: 'ACCEPTED' })
      toast.success('Candidatura aceita')
      void load()
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao aceitar candidatura')
    }
  }

  const handleReject = async (applicationId: string) => {
    try {
      await apiClient.patch(`/applications/${applicationId}/status`, { status: 'REJECTED' })
      toast.success('Candidatura recusada')
      void load()
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao recusar candidatura')
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await apiClient.patch(`/shifts/${params.id}`, { status: 'CANCELLED' })
      toast.success('Plantão cancelado')
      router.push('/hospital/plantoes')
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao cancelar plantão')
    } finally {
      setCancelling(false)
      setCancelDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!shift) {
    return (
      <div className="text-center py-16 text-slate-400">
        Plantão não encontrado.
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
          <CardTitle className="text-base">Detalhes do plantão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
              <span>{shift.filledSlots}/{shift.slots} vagas preenchidas</span>
            </div>
          </div>
          {shift.status === 'OPEN' && (
            <div className="pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-1.5" />
                Cancelar plantão
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Candidatos ({applications.length})
        </h2>
        {applications.length === 0 ? (
          <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Nenhum candidato ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <CandidaturaCard
                key={app.id}
                application={app}
                variant="hospital"
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar plantão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar este plantão? Todos os candidatos serão
              notificados e a ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Manter plantão
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
