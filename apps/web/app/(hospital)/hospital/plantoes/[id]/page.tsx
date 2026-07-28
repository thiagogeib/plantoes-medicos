'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PlantaoStatusBadge } from '@/components/shared/plantao/PlantaoStatusBadge'
import { CandidaturaCard } from '@/components/shared/candidatura/CandidaturaCard'
import { Badge } from '@/components/ui/badge'
import { compensationLabels } from '@/lib/compensation'
import type { Shift, Application, ApiResponse, ApiListResponse, ApiError } from '@plantoes-medicos/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, MapPin, Clock, Users, Trash2, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function PlantaoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [shift, setShift] = useState<Shift | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [shiftRes, appsRes] = await Promise.all([
          apiClient.get<ApiResponse<Shift>>(`/shifts/${id}`),
          apiClient.get<ApiListResponse<Application>>(`/shifts/${id}/applications`),
        ])
        setShift(shiftRes.data)
        setApplications(appsRes.data)
      } catch {
        toast.error('Erro ao carregar plantão')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleStatus(applicationId: string, status: 'ACCEPTED' | 'REJECTED') {
    try {
      await apiClient.patch(`/applications/${applicationId}/status`, { status })
      toast.success(status === 'ACCEPTED' ? 'Candidato aceito' : 'Candidato recusado')
      if (status === 'ACCEPTED') {
        const [shiftRes, appsRes] = await Promise.all([
          apiClient.get<ApiResponse<Shift>>(`/shifts/${id}`),
          apiClient.get<ApiListResponse<Application>>(`/shifts/${id}/applications`),
        ])
        setShift(shiftRes.data)
        setApplications(appsRes.data)
        if (appsRes.data.some((a) => a.status === 'REJECTED' && a.id !== applicationId)) {
          toast.info('Os demais candidatos pendentes foram recusados automaticamente')
        }
      } else {
        setApplications((prev) =>
          prev.map((a) => (a.id === applicationId ? { ...a, status } : a))
        )
      }
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao atualizar candidatura')
    }
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      await apiClient.del(`/shifts/${id}`)
      toast.success('Plantão cancelado')
      router.push('/hospital/plantoes')
    } catch {
      toast.error('Erro ao cancelar plantão')
    } finally {
      setCancelling(false)
      setCancelOpen(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await apiClient.del(`/shifts/${id}/permanent`)
      toast.success('Plantão excluído permanentemente')
      router.push('/hospital/plantoes')
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao excluir plantão')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!shift) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex items-center gap-2">
          {(shift.status === 'OPEN' || shift.status === 'FILLED') && (
            <Link href={`/hospital/plantoes/${id}/editar`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
            </Link>
          )}

          {shift.filledSlots === 0 ? (
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir plantão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir plantão permanentemente</DialogTitle>
                  <DialogDescription>
                    Como este plantão ainda não tem nenhuma candidatura aceita, ele pode ser excluído por completo — inclusive candidaturas pendentes serão removidas junto. Essa ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>Voltar</Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : shift.status === 'OPEN' && (
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50">
                  <Trash2 className="h-4 w-4 mr-2" /> Cancelar plantão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancelar plantão</DialogTitle>
                  <DialogDescription>
                    Este plantão já tem candidatura aceita, então não pode ser excluído — apenas cancelado. Os candidatos serão notificados do cancelamento.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCancelOpen(false)}>Voltar</Button>
                  <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                    {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl">{shift.title}</CardTitle>
            <PlantaoStatusBadge status={shift.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">{shift.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4" />
              <span>
                {format(new Date(shift.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} — {shift.startTime} às {shift.endTime}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4" />
              <span>{shift.location}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="h-4 w-4" />
              <span>{shift.filledSlots}/{shift.slots} vagas preenchidas</span>
            </div>
            {shift.specialty && (
              <div className="text-slate-600">
                <span className="font-medium">Especialidade: </span>{shift.specialty.name}
              </div>
            )}
          </div>
          <div>
            <Badge variant="outline">{compensationLabels[shift.compensationType]}</Badge>
            {shift.compensationType === 'OTHER' && shift.compensationNote && (
              <p className="text-sm text-slate-500 mt-1.5">{shift.compensationNote}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Candidatos ({applications.length})
        </h2>
        {applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              Nenhuma candidatura ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <CandidaturaCard
                key={app.id}
                application={app}
                variant="hospital"
                onAccept={() => handleStatus(app.id, 'ACCEPTED')}
                onReject={() => handleStatus(app.id, 'REJECTED')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
