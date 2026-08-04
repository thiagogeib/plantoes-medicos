'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
import type { HospitalStaff, StaffStatus, ApiListResponse } from '@plantoes-medicos/types'

const statusLabel: Record<StaffStatus, string> = {
  INVITED: 'Convite enviado',
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
}

const statusVariant: Record<StaffStatus, 'warning' | 'success' | 'secondary'> = {
  INVITED: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'secondary',
}

const STATUS_OPTIONS: { value: StaffStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'INVITED', label: statusLabel.INVITED },
  { value: 'ACTIVE', label: statusLabel.ACTIVE },
  { value: 'INACTIVE', label: statusLabel.INACTIVE },
]

export default function AdminEquipePage() {
  const [statusFilter, setStatusFilter] = useState<StaffStatus | ''>('')
  const [page, setPage] = useState(1)
  const [staff, setStaff] = useState<HospitalStaff[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await apiClient.get<ApiListResponse<HospitalStaff>>(`/admin/staff?${params.toString()}`)
      setStaff(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      toast.error('Erro ao carregar equipe')
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
        <h1 className="text-2xl font-bold text-slate-900">Equipes</h1>
        <p className="text-slate-500 text-sm mt-0.5">Vínculos entre hospitais e profissionais na plataforma</p>
      </div>

      <div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val === '__all__' ? '' : (val as StaffStatus))
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
              <TableHead>Hospital</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Banco de horas</TableHead>
              <TableHead>Desde</TableHead>
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
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                  Nenhum vínculo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              staff.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium text-slate-900">
                    {link.hospital?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {link.professional?.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{link.type === 'FIXO' ? 'Fixo' : 'Avulso'}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {Math.round((link.hourBankMinutes / 60) * 10) / 10}h
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {link.joinedAt ? format(parseISO(link.joinedAt), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[link.status]}>{statusLabel[link.status]}</Badge>
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
