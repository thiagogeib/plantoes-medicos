'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { formatDateOnly } from '@/lib/date-utils'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Building2, Users, Plus } from 'lucide-react'
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
import type { LeaveRequest, LeaveRequestStatus, ApiError, HospitalStaff } from '@plantoes-medicos/types'

const statusLabel: Record<LeaveRequestStatus, string> = {
  PENDING: 'Aguardando coordenador',
  APPROVED_PENDING_COVERAGE: 'Aberta — aguardando candidatos',
  CANCELLATION_REQUESTED: 'Cancelamento pedido — aguardando coordenador',
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

function computeDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let minutes = eh * 60 + em - (sh * 60 + sm)
  if (minutes <= 0) minutes += 24 * 60
  return minutes
}

interface MeResponse {
  data: {
    professionalProfile: {
      specialties: { specialty: { id: string; name: string } }[]
    } | null
  }
}

function LeaveShiftInfo({ leave }: { leave: LeaveRequest }) {
  if (!leave.shift) return null
  const candidatos = leave.shift.applications?.length ?? 0
  return (
    <div className="space-y-1">
      <div className="font-semibold text-slate-900">{leave.shift.title}</div>
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        <span>{formatDateOnly(leave.shift.date)} — {leave.shift.startTime}–{leave.shift.endTime}</span>
      </div>
      {leave.shift.hospital && (
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Building2 className="h-3.5 w-3.5" />
          <span>{leave.shift.hospital.name}</span>
        </div>
      )}
      {leave.status === 'APPROVED_PENDING_COVERAGE' && (
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Users className="h-3.5 w-3.5" />
          <span>{candidatos} candidatura(s) recebidas</span>
        </div>
      )}
    </div>
  )
}

export default function FolgasProfissionalPage() {
  const [mine, setMine] = useState<LeaveRequest[]>([])
  const [staffLinks, setStaffLinks] = useState<HospitalStaff[]>([])
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [hospitalId, setHospitalId] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [mineRes, staffRes, meRes] = await Promise.all([
        apiClient.get<{ data: LeaveRequest[] }>('/leave-requests/mine'),
        apiClient.get<{ data: HospitalStaff[] }>('/staff/me').catch(() => ({ data: [] })),
        apiClient.get<MeResponse>('/auth/me'),
      ])
      setMine(mineRes.data)
      setStaffLinks(staffRes.data.filter((s) => s.status === 'ACTIVE' && s.type === 'FIXO'))
      setSpecialties((meRes.data.professionalProfile?.specialties ?? []).map((s) => s.specialty))
    } catch {
      toast.error('Erro ao carregar folgas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (staffLinks.length === 1) setHospitalId(staffLinks[0].hospitalId)
  }, [staffLinks])

  const selectedStaffLink = useMemo(
    () => staffLinks.find((s) => s.hospitalId === hospitalId) ?? null,
    [staffLinks, hospitalId]
  )

  const durationMinutes = startTime && endTime ? computeDurationMinutes(startTime, endTime) : 0
  const insufficientBalance =
    !!selectedStaffLink && durationMinutes > 0 && durationMinutes > selectedStaffLink.hourBankMinutes

  async function handleCreate() {
    if (!hospitalId) {
      toast.error('Selecione o hospital')
      return
    }
    if (!specialtyId) {
      toast.error('Selecione a área de atuação')
      return
    }
    if (!date || !startTime || !endTime) {
      toast.error('Preencha data e horário')
      return
    }
    if (insufficientBalance) {
      toast.error('Saldo de banco de horas insuficiente para essa duração')
      return
    }
    setCreating(true)
    try {
      await apiClient.post('/leave-requests', {
        hospitalId,
        specialtyId,
        date,
        startTime,
        endTime,
        reason: reason || undefined,
      })
      toast.success('Folga solicitada — vaga de cobertura aberta na busca de plantões')
      setCreateOpen(false)
      setSpecialtyId('')
      setDate('')
      setStartTime('')
      setEndTime('')
      setReason('')
      void load()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao solicitar folga')
    } finally {
      setCreating(false)
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

  async function handleRequestCancellation(id: string) {
    setBusyId(id)
    try {
      await apiClient.patch(`/leave-requests/${id}/request-cancellation`, {})
      toast.success('Pedido de cancelamento enviado ao coordenador')
      void load()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao pedir cancelamento')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Folgas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Solicite folga informando data, horário e área de atuação — uma vaga de cobertura é aberta
            automaticamente para outro profissional se candidatar. Para cobrir a folga de um colega, use{' '}
            <span className="font-medium">Buscar Plantões</span>.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Solicitar folga
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar folga</DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo. As horas solicitadas são descontadas do seu banco de horas
                — se ninguém se candidatar à vaga dentro do prazo do hospital, a folga é cancelada e as
                horas voltam automaticamente.
              </DialogDescription>
            </DialogHeader>
            {staffLinks.length === 0 ? (
              <p className="text-sm text-slate-500">
                Solicitação de folga é exclusiva para plantonistas fixos ativos do quadro de algum hospital.
              </p>
            ) : (
              <div className="space-y-3">
                {staffLinks.length > 1 && (
                  <Select value={hospitalId} onValueChange={setHospitalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffLinks.map((s) => (
                        <SelectItem key={s.hospitalId} value={s.hospitalId}>
                          {s.hospital?.name ?? s.hospitalId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedStaffLink && (
                  <p className="text-sm text-slate-500">
                    Banco de horas atual: <span className="font-medium text-slate-700">{Math.round((selectedStaffLink.hourBankMinutes / 60) * 10) / 10}h</span>
                  </p>
                )}

                <Select value={specialtyId} onValueChange={setSpecialtyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Área de atuação" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

                <div className="grid grid-cols-2 gap-3">
                  <Input type="time" placeholder="Início" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  <Input type="time" placeholder="Fim" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>

                {durationMinutes > 0 && (
                  <p className={`text-sm ${insufficientBalance ? 'text-red-600' : 'text-slate-500'}`}>
                    Duração: {Math.round((durationMinutes / 60) * 10) / 10}h
                    {insufficientBalance && ' — saldo insuficiente'}
                  </p>
                )}

                <Textarea
                  placeholder="Motivo..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating || staffLinks.length === 0}>
                {creating ? 'Enviando...' : 'Confirmar solicitação'}
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
          <Card><CardContent className="py-8 text-center text-slate-400">Você ainda não solicitou nenhuma folga.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {mine.map((leave) => {
              const isLong = (leave.shift?.hospital?.longLeaveThresholdMinutes ?? Infinity) <= leave.durationMinutes
              return (
                <Card key={leave.id}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <LeaveShiftInfo leave={leave} />
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge variant={statusVariant[leave.status]}>{statusLabel[leave.status]}</Badge>
                        {isLong && <Badge variant="outline">Folga longa</Badge>}
                        <span className="text-xs text-slate-400">
                          {Math.round((leave.durationMinutes / 60) * 10) / 10}h de folga
                        </span>
                      </div>
                    </div>
                    {leave.status === 'PENDING' && (
                      <Button size="sm" variant="outline" onClick={() => handleCancel(leave.id)} disabled={busyId === leave.id}>
                        Cancelar solicitação
                      </Button>
                    )}
                    {leave.status === 'APPROVED_PENDING_COVERAGE' && (
                      <Button size="sm" variant="outline" onClick={() => handleRequestCancellation(leave.id)} disabled={busyId === leave.id}>
                        Pedir cancelamento
                      </Button>
                    )}
                    {leave.status === 'CANCELLATION_REQUESTED' && (
                      <p className="text-sm text-slate-500">
                        Seu pedido de cancelamento está com o coordenador — aguarde a decisão.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
