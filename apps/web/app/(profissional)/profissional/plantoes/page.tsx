'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Search, LayoutGrid, List as ListIcon, MapPin, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { EmptyStateIllustration } from '@/components/shared/ui/EmptyStateIllustration'
import { toast } from 'sonner'
import { useShifts } from '@/hooks/use-shifts'
import { PlantaoCard } from '@/components/shared/plantao/PlantaoCard'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateOnly } from '@/lib/date-utils'

const ShiftsMap = dynamic(
  () => import('@/components/shared/plantao/ShiftsMap').then((m) => m.ShiftsMap),
  { ssr: false, loading: () => <Skeleton className="h-[440px] w-full" /> }
)
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'
import { compensationLabels } from '@/lib/compensation'
import type { Specialty, ApiListResponse, CompensationType, ShiftSwapRequest, HospitalStaff } from '@plantoes-medicos/types'

const diaSemanaLabel = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export default function ProfissionalPlantoesPage() {
  const router = useRouter()
  const [specialtyId, setSpecialtyId] = useState('')
  const [hospitalId, setHospitalId] = useState('')
  const [city, setCity] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [compensationType, setCompensationType] = useState<CompensationType | ''>('')
  const [raioKm, setRaioKm] = useState('')
  const [date, setDate] = useState('')
  const [diaSemana, setDiaSemana] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [myHospitals, setMyHospitals] = useState<HospitalStaff[]>([])
  const [swaps, setSwaps] = useState<ShiftSwapRequest[]>([])
  const [busySwapId, setBusySwapId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'map'>('card')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [applyingBulk, setApplyingBulk] = useState(false)

  const { shifts, totalPages, loading, reload } = useShifts({
    specialtyId,
    hospitalId,
    city,
    compensationType: compensationType || undefined,
    raioKm: raioKm ? Number(raioKm) : undefined,
    date: date || undefined,
    diaSemana: diaSemana === '' ? undefined : diaSemana,
    page: viewMode === 'map' ? 1 : page,
    limit: viewMode === 'map' ? 100 : undefined,
  })

  const loadSwaps = useCallback(async () => {
    try {
      const res = await apiClient.get<{ data: ShiftSwapRequest[] }>('/shift-swaps/available')
      setSwaps(res.data)
    } catch {
      // silencioso — não deve travar a busca normal de plantões
    }
  }, [])

  useEffect(() => {
    apiClient
      .get<ApiListResponse<Specialty>>('/specialties')
      .then((res) => setSpecialties(res.data))
      .catch(() => toast.error('Erro ao carregar especialidades'))
    apiClient
      .get<{ data: HospitalStaff[] }>('/staff/me')
      .then((res) => setMyHospitals(res.data.filter((s) => s.status === 'ACTIVE')))
      .catch(() => {
        // silencioso — filtro por hospital só não aparece populado
      })
    void loadSwaps()
  }, [loadSwaps])

  useEffect(() => {
    setSelected(new Set())
  }, [shifts])

  const filteredSwaps = useMemo(() => {
    return swaps.filter((swap) => {
      if (!swap.shift) return false
      if (specialtyId && swap.shift.specialtyId !== specialtyId) return false
      if (hospitalId && swap.shift.hospitalId !== hospitalId) return false
      if (compensationType && swap.shift.compensationType !== compensationType) return false
      if (city && !swap.shift.hospital?.city?.toLowerCase().includes(city.toLowerCase())) return false
      return true
    })
  }, [swaps, specialtyId, hospitalId, compensationType, city])

  const handleSearch = () => {
    setCity(cityInput)
    setPage(1)
  }

  function toggleSelect(shiftId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(shiftId)) next.delete(shiftId)
      else next.add(shiftId)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === shifts.length ? new Set() : new Set(shifts.map((s) => s.id))))
  }

  async function handleBulkApply() {
    setApplyingBulk(true)
    const ids = Array.from(selected)
    const results = await Promise.allSettled(
      ids.map((id) => apiClient.post(`/shifts/${id}/applications`, {}))
    )
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const fail = results.length - ok
    if (ok > 0) toast.success(`Candidatura enviada para ${ok} vaga(s)`)
    if (fail > 0) toast.error(`${fail} candidatura(s) não puderam ser enviadas`)
    setSelected(new Set())
    setApplyingBulk(false)
    void reload()
  }

  async function handleSwapInterest(swapId: string) {
    setBusySwapId(swapId)
    try {
      await apiClient.post(`/shift-swaps/${swapId}/interest`, {})
      toast.success('Interesse registrado! O coordenador foi notificado.')
      void loadSwaps()
    } catch {
      toast.error('Erro ao manifestar interesse nesta troca')
    } finally {
      setBusySwapId(null)
    }
  }

  const showSwaps = page === 1 && filteredSwaps.length > 0
  const noResults = !loading && shifts.length === 0 && !showSwaps
  const hasActiveFilters = !!(specialtyId || hospitalId || compensationType || city || raioKm || date || diaSemana !== '')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buscar Plantões</h1>
          <p className="text-slate-500 text-sm mt-0.5">Encontre plantões disponíveis para se candidatar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="sm:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            Filtros
            {hasActiveFilters && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-indigo-600" />}
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </Button>
          <div className="flex gap-1 border rounded-md p-0.5">
            <Button
              size="sm"
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('card')}
              aria-label="Ver em cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('list')}
              aria-label="Ver em lista"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('map')}
              aria-label="Ver no mapa"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className={`flex-col sm:flex-row gap-3 flex-wrap ${filtersOpen ? 'flex' : 'hidden sm:flex'}`}>
        <Select
          value={specialtyId}
          onValueChange={(val) => {
            setSpecialtyId(val === '__all__' ? '' : val)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Especialidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as especialidades</SelectItem>
            {specialties.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {myHospitals.length > 0 && (
          <Select
            value={hospitalId}
            onValueChange={(val) => {
              setHospitalId(val === '__all__' ? '' : val)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Hospital" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os hospitais</SelectItem>
              {myHospitals.map((link) => (
                <SelectItem key={link.hospitalId} value={link.hospitalId}>
                  {link.hospital?.name ?? 'Hospital'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={compensationType}
          onValueChange={(val) => {
            setCompensationType(val === '__all__' ? '' : (val as CompensationType))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Compensação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Qualquer compensação</SelectItem>
            {(Object.keys(compensationLabels) as CompensationType[]).map((c) => (
              <SelectItem key={c} value={c}>
                {compensationLabels[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={diaSemana === '' ? '' : String(diaSemana)}
          onValueChange={(val) => {
            setDiaSemana(val === '__all__' ? '' : Number(val))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Dia da semana" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Qualquer dia</SelectItem>
            {diaSemanaLabel.map((label, i) => (
              <SelectItem key={i} value={String(i)}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-full sm:w-40"
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            setPage(1)
          }}
        />

        <Input
          type="number"
          min={1}
          max={500}
          placeholder="Raio (km)"
          className="w-full sm:w-32"
          value={raioKm}
          onChange={(e) => {
            setRaioKm(e.target.value)
            setPage(1)
          }}
        />

        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Cidade"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} aria-label="Buscar plantões">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-md px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} vaga(s) selecionada(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Limpar
            </Button>
            <Button size="sm" onClick={handleBulkApply} disabled={applyingBulk}>
              {applyingBulk ? 'Enviando...' : `Candidatar-se a todas (${selected.size})`}
            </Button>
          </div>
        </div>
      )}

      {viewMode === 'map' ? (
        <ShiftsMap shifts={shifts} />
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <PlantaoCard key={i} />)
            : (
              <>
                {showSwaps &&
                  filteredSwaps.map((swap) => (
                    <PlantaoCard
                      key={`swap-${swap.id}`}
                      shift={swap.shift}
                      isSwapOffer
                      swapOfferedBy={swap.requestingProfessional?.name}
                      onApply={() => handleSwapInterest(swap.id)}
                      applyDisabled={busySwapId === swap.id}
                    />
                  ))}
                {shifts.map((shift) => (
                  <PlantaoCard
                    key={shift.id}
                    shift={shift}
                    selectable
                    selected={selected.has(shift.id)}
                    onToggleSelect={() => toggleSelect(shift.id)}
                    onApply={() => router.push(`/profissional/plantoes/${shift.id}`)}
                  />
                ))}
              </>
            )}
          {noResults && !hasActiveFilters && (
            <div className="col-span-3 text-center py-16 space-y-3">
              <EmptyStateIllustration />
              <p className="text-slate-500">
                Você ainda não faz parte do quadro de nenhum hospital.
              </p>
              <p className="text-slate-400 text-sm">
                Busque vagas abertas na vitrine pública e candidate-se — depois de aceito,
                o hospital passa a aparecer aqui automaticamente.
              </p>
              <Link href="/vagas" target="_blank">
                <Button variant="outline" size="sm">Buscar vagas abertas</Button>
              </Link>
            </div>
          )}
          {noResults && hasActiveFilters && (
            <div className="col-span-3 text-center py-16 text-slate-400">
              Nenhum plantão disponível com esses filtros.
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={shifts.length > 0 && selected.size === shifts.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Selecionar todas"
                  />
                </TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Vagas</TableHead>
                <TableHead>Compensação</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(shift.id)}
                      onCheckedChange={() => toggleSelect(shift.id)}
                      aria-label="Selecionar vaga"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{shift.title}</TableCell>
                  <TableCell>{shift.hospital?.name}</TableCell>
                  <TableCell>{shift.specialty?.name}</TableCell>
                  <TableCell>{shift.requiredCouncilType === 'CRM' ? 'Médico' : 'Enfermeiro'}</TableCell>
                  <TableCell>{formatDateOnly(shift.date)}</TableCell>
                  <TableCell>{shift.startTime}–{shift.endTime}</TableCell>
                  <TableCell>{shift.filledSlots}/{shift.slots}</TableCell>
                  <TableCell>{compensationLabels[shift.compensationType]}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/profissional/plantoes/${shift.id}`)}>
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && shifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-slate-400 py-10">
                    Nenhum plantão disponível com esses filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {viewMode !== 'map' && totalPages > 1 && (
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
