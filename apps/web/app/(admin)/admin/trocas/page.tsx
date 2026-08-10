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
import type { ShiftSwapRequest, SwapRequestStatus, ApiListResponse } from '@plantoes-medicos/types'

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

const STATUS_OPTIONS: { value: SwapRequestStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'OPEN', label: statusLabel.OPEN },
  { value: 'PENDING_APPROVAL', label: statusLabel.PENDING_APPROVAL },
  { value: 'APPROVED', label: statusLabel.APPROVED },
  { value: 'REJECTED', label: statusLabel.REJECTED },
  { value: 'CANCELLED', label: statusLabel.CANCELLED },
]

export default function AdminTrocasPage() {
  const [statusFilter, setStatusFilter] = useState<SwapRequestStatus | ''>('')
  const [page, setPage] = useState(1)
  const [swaps, setSwaps] = useState<ShiftSwapRequest[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await apiClient.get<ApiListResponse<ShiftSwapRequest>>(`/admin/swaps?${params.toString()}`)
      setSwaps(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      toast.error('Erro ao carregar trocas')
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
        <h1 className="text-2xl font-bold text-slate-900">Trocas de plantão</h1>
        <p className="text-slate-500 text-sm mt-0.5">Todas as solicitações de troca da plataforma</p>
      </div>

      <div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val === '__all__' ? '' : (val as SwapRequestStatus))
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

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plantão</TableHead>
              <TableHead>Hospital</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Interessados</TableHead>
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
            ) : swaps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                  Nenhuma troca encontrada.
                </TableCell>
              </TableRow>
            ) : (
              swaps.map((swap) => (
                <TableRow key={swap.id}>
                  <TableCell className="font-medium text-slate-900 max-w-[180px] truncate">
                    {swap.shift?.title ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {swap.shift?.hospital?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {swap.requestingProfessional?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {swap.shift?.date ? formatDateOnly(swap.shift.date) : '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{swap.interests.length}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[swap.status]}>{statusLabel[swap.status]}</Badge>
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
