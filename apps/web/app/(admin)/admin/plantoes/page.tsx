'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { formatDateOnly } from '@/lib/date-utils'
import { apiClient } from '@/lib/api-client'
import { PlantaoStatusBadge } from '@/components/shared/plantao/PlantaoStatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import type { Shift, ShiftStatus, ApiListResponse } from '@plantoes-medicos/types'

const STATUS_OPTIONS: { value: ShiftStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'OPEN', label: 'Aberto' },
  { value: 'FILLED', label: 'Preenchido' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

export default function AdminPlantoesPage() {
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | ''>('')
  const [councilFilter, setCouncilFilter] = useState<'CRM' | 'COREN' | ''>('')
  const [page, setPage] = useState(1)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (statusFilter) params.set('status', statusFilter)
      if (councilFilter) params.set('requiredCouncilType', councilFilter)
      const res = await apiClient.get<ApiListResponse<Shift>>(`/shifts?${params.toString()}`)
      setShifts(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      toast.error('Erro ao carregar plantões')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, councilFilter, page])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Plantões</h1>
        <p className="text-slate-500 text-sm mt-0.5">Todos os plantões da plataforma</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val === '__all__' ? '' : (val as ShiftStatus))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
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

        <Select
          value={councilFilter || '__all__'}
          onValueChange={(val) => {
            setCouncilFilter(val === '__all__' ? '' : (val as 'CRM' | 'COREN'))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Conselho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os conselhos</SelectItem>
            <SelectItem value="CRM">CRM</SelectItem>
            <SelectItem value="COREN">COREN</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Hospital</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Vagas</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                  Nenhum plantão encontrado.
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium text-slate-900 max-w-[180px] truncate">
                    {shift.title}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {shift.hospital?.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    {shift.specialty ? (
                      <Badge variant="secondary">{shift.specialty.name}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {formatDateOnly(shift.date)}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {shift.filledSlots}/{shift.slots}
                  </TableCell>
                  <TableCell>
                    <PlantaoStatusBadge status={shift.status} />
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
