'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyStateIllustration } from '@/components/shared/ui/EmptyStateIllustration'
import type { Application, ApplicationStatus, ApiListResponse, ApiError } from '@plantoes-medicos/types'

const statusLabel: Record<ApplicationStatus, string> = {
  PENDING: 'Pendente',
  PENDING_CONFIRMATION: 'Aguardando confirmação',
  ACCEPTED: 'Aceita',
  REJECTED: 'Recusada',
  WITHDRAWN: 'Retirada',
}

const statusVariant: Record<ApplicationStatus, 'warning' | 'success' | 'secondary' | 'destructive'> = {
  PENDING: 'warning',
  PENDING_CONFIRMATION: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'destructive',
  WITHDRAWN: 'secondary',
}

const STATUS_OPTIONS: { value: ApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'Pendentes (padrão)' },
  { value: 'PENDING', label: statusLabel.PENDING },
  { value: 'PENDING_CONFIRMATION', label: statusLabel.PENDING_CONFIRMATION },
  { value: 'ACCEPTED', label: statusLabel.ACCEPTED },
  { value: 'REJECTED', label: statusLabel.REJECTED },
  { value: 'WITHDRAWN', label: statusLabel.WITHDRAWN },
]

export default function HospitalCandidaturasPage() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('')
  const [page, setPage] = useState(1)
  const [applications, setApplications] = useState<Application[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [applyingBulk, setApplyingBulk] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await apiClient.get<ApiListResponse<Application>>(`/applications/hospital?${params.toString()}`)
      setApplications(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      toast.error('Erro ao carregar candidaturas')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setSelected(new Set())
  }, [applications])

  // só faz sentido selecionar candidaturas ainda pendentes — aceitas/recusadas não têm ação em massa
  const selectableIds = applications.filter((a) => a.status === 'PENDING').map((a) => a.id)

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === selectableIds.length ? new Set() : new Set(selectableIds)))
  }

  async function handleStatus(id: string, status: 'ACCEPTED' | 'REJECTED') {
    setBusyId(id)
    try {
      await apiClient.patch(`/applications/${id}/status`, { status })
      toast.success(status === 'ACCEPTED' ? 'Candidato aprovado' : 'Candidato recusado')
      void load()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao atualizar candidatura')
    } finally {
      setBusyId(null)
    }
  }

  async function handleBulkAccept() {
    setApplyingBulk(true)
    const ids = Array.from(selected)
    const results = await Promise.allSettled(
      ids.map((id) => apiClient.patch(`/applications/${id}/status`, { status: 'ACCEPTED' }))
    )
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const fail = results.length - ok
    if (ok > 0) toast.success(`${ok} candidato(s) aprovado(s)`)
    if (fail > 0) toast.error(`${fail} não puderam ser aprovados (provavelmente sem vagas suficientes)`)
    setSelected(new Set())
    setApplyingBulk(false)
    void load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidaturas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Todas as candidaturas recebidas nos seus plantões — selecione várias para aprovar em massa
          </p>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val === '__all__' ? '' : (val as ApplicationStatus))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-md px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} candidato(s) selecionado(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Limpar
            </Button>
            <Button size="sm" onClick={handleBulkAccept} disabled={applyingBulk}>
              {applyingBulk ? 'Aprovando...' : `Aprovar selecionados (${selected.size})`}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                {selectableIds.length > 0 && (
                  <Checkbox
                    checked={selected.size === selectableIds.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Selecionar todas"
                  />
                )}
              </TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Conselho</TableHead>
              <TableHead>Plantão</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-14">
                  <EmptyStateIllustration size={72} className="mb-2" />
                  <p className="text-slate-400">Nenhuma candidatura encontrada.</p>
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    {app.status === 'PENDING' && (
                      <Checkbox
                        checked={selected.has(app.id)}
                        onCheckedChange={() => toggleSelect(app.id)}
                        aria-label="Selecionar candidatura"
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{app.professional?.name}</TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {app.professional?.councilType} {app.professional?.councilNumber}
                    {app.professional?.councilState ? `/${app.professional.councilState}` : ''}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm max-w-[200px] truncate">
                    <Link href={`/hospital/plantoes/${app.shiftId}`} className="hover:underline hover:text-indigo-600">
                      {app.shift?.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {app.shift?.specialty ? (
                      <Badge variant="secondary">{app.shift.specialty.name}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {app.shift?.date ? format(parseISO(app.shift.date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[app.status]}>{statusLabel[app.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {app.status === 'PENDING' && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => handleStatus(app.id, 'REJECTED')}
                          disabled={busyId === app.id}
                        >
                          Recusar
                        </Button>
                        <Button size="sm" onClick={() => handleStatus(app.id, 'ACCEPTED')} disabled={busyId === app.id}>
                          Aprovar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <span className="text-sm text-slate-500">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
