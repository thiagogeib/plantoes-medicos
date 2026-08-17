'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { HospitalStaff, StaffStatus, ApiListResponse, Specialty } from '@plantoes-medicos/types'

interface StaffDetail extends HospitalStaff {
  hospital?: HospitalStaff['hospital'] & { phone?: string }
  professional?: HospitalStaff['professional'] & {
    phone?: string
    specialties?: { specialty: { id: string; name: string } }[]
  }
}

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

const COUNCIL_OPTIONS: { value: string; label: string }[] = [
  { value: '__all__', label: 'Todos os conselhos' },
  { value: 'CRM', label: 'CRM' },
  { value: 'COREN', label: 'COREN' },
]

export default function AdminEquipePage() {
  const [statusFilter, setStatusFilter] = useState<StaffStatus | ''>('')
  const [councilFilter, setCouncilFilter] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('')
  const [search, setSearch] = useState('')
  const [joinedFrom, setJoinedFrom] = useState('')
  const [page, setPage] = useState(1)
  const [staff, setStaff] = useState<StaffDetail[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [detailTarget, setDetailTarget] = useState<StaffDetail | null>(null)

  useEffect(() => {
    apiClient
      .get<ApiListResponse<Specialty>>('/specialties')
      .then((res) => setSpecialties(res.data))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (statusFilter) params.set('status', statusFilter)
      if (councilFilter) params.set('councilType', councilFilter)
      if (specialtyFilter) params.set('specialtyId', specialtyFilter)
      if (search) params.set('search', search)
      if (joinedFrom) params.set('joinedFrom', joinedFrom)
      const res = await apiClient.get<ApiListResponse<StaffDetail>>(`/admin/staff?${params.toString()}`)
      setStaff(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      toast.error('Erro ao carregar equipe')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, councilFilter, specialtyFilter, search, joinedFrom, page])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Equipes</h1>
        <p className="text-slate-500 text-sm mt-0.5">Vínculos entre hospitais e profissionais na plataforma</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por profissional"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full sm:w-56"
        />
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val === '__all__' ? '' : (val as StaffStatus))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
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
          value={specialtyFilter || '__all__'}
          onValueChange={(val) => { setSpecialtyFilter(val === '__all__' ? '' : val); setPage(1) }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Especialidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as especialidades</SelectItem>
            {specialties.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={councilFilter || '__all__'}
          onValueChange={(val) => { setCouncilFilter(val === '__all__' ? '' : val); setPage(1) }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Conselho" />
          </SelectTrigger>
          <SelectContent>
            {COUNCIL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={joinedFrom}
          onChange={(e) => { setJoinedFrom(e.target.value); setPage(1) }}
          className="w-full sm:w-44"
          title="Vinculado desde"
        />
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
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-400">
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
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setDetailTarget(link)}>
                      Ver detalhes
                    </Button>
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

      <Dialog open={!!detailTarget} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailTarget?.professional?.name}</DialogTitle>
            <DialogDescription>Vínculo com {detailTarget?.hospital?.name}</DialogDescription>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-400">Conselho: </span>
                <span className="font-medium">
                  {detailTarget.professional?.councilType} {detailTarget.professional?.councilNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400">CPF: </span>
                <span className="font-medium">{detailTarget.professional?.cpf ?? '—'}</span>
              </div>
              <div>
                <span className="text-slate-400">Telefone do profissional: </span>
                <span className="font-medium">{detailTarget.professional?.phone ?? '—'}</span>
              </div>
              <div>
                <span className="text-slate-400">Especialidades: </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(detailTarget.professional?.specialties ?? []).map((s) => (
                    <Badge key={s.specialty.id} variant="secondary">{s.specialty.name}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Hospital: </span>
                <span className="font-medium">
                  {detailTarget.hospital?.name} — {detailTarget.hospital?.city}/{detailTarget.hospital?.state}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Telefone do hospital: </span>
                <span className="font-medium">{detailTarget.hospital?.phone ?? '—'}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
