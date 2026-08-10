'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { formatDateOnly } from '@/lib/date-utils'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type { LeaveRequest, LeaveRequestStatus, ApiListResponse } from '@plantoes-medicos/types'

const statusLabel: Record<LeaveRequestStatus, string> = {
  PENDING: 'Aguardando avaliação',
  APPROVED_PENDING_COVERAGE: 'Vaga aberta — aguardando candidatos',
  CANCELLATION_REQUESTED: 'Profissional pediu cancelamento',
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

const STATUS_OPTIONS: { value: LeaveRequestStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDING', label: statusLabel.PENDING },
  { value: 'APPROVED_PENDING_COVERAGE', label: statusLabel.APPROVED_PENDING_COVERAGE },
  { value: 'CANCELLATION_REQUESTED', label: statusLabel.CANCELLATION_REQUESTED },
  { value: 'COVERED', label: statusLabel.COVERED },
  { value: 'REJECTED', label: statusLabel.REJECTED },
  { value: 'CANCELLED', label: statusLabel.CANCELLED },
]

export default function AdminFolgasPage() {
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | ''>('')
  const [page, setPage] = useState(1)
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await apiClient.get<ApiListResponse<LeaveRequest>>(`/admin/leave-requests?${params.toString()}`)
      setLeaves(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      toast.error('Erro ao carregar folgas')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Folgas</h1>
        <p className="text-slate-500 text-sm mt-0.5">Todas as solicitações de folga da plataforma</p>
      </div>

      <div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val === '__all__' ? '' : (val as LeaveRequestStatus))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-64">
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

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plantão</TableHead>
              <TableHead>Hospital</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : leaves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                  Nenhuma folga encontrada.
                </TableCell>
              </TableRow>
            ) : (
              leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell className="font-medium text-slate-900 max-w-[180px] truncate">
                    {leave.shift?.title ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {leave.shift?.hospital?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {leave.professional?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {formatDateOnly(leave.date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[leave.status]}>{statusLabel[leave.status]}</Badge>
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
