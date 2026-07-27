'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { useShifts } from '@/hooks/use-shifts'
import { PlantaoCard } from '@/components/shared/plantao/PlantaoCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'
import type { Specialty, ApiListResponse, CompensationType, Turno } from '@plantoes-medicos/types'

const turnoLabel: Record<Turno, string> = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' }
const compensationLabel: Record<CompensationType, string> = {
  MONEY: 'Pagamento em dinheiro',
  HOUR_BANK: 'Banco de horas',
  OTHER: 'Outra forma',
}

export default function ProfissionalPlantoesPage() {
  const router = useRouter()
  const [specialtyId, setSpecialtyId] = useState('')
  const [city, setCity] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [turno, setTurno] = useState<Turno | ''>('')
  const [compensationType, setCompensationType] = useState<CompensationType | ''>('')
  const [page, setPage] = useState(1)
  const [specialties, setSpecialties] = useState<Specialty[]>([])

  const { shifts, totalPages, loading } = useShifts({
    specialtyId,
    city,
    turno: turno || undefined,
    compensationType: compensationType || undefined,
    page,
  })

  useEffect(() => {
    apiClient
      .get<ApiListResponse<Specialty>>('/specialties')
      .then((res) => setSpecialties(res.data))
      .catch(() => toast.error('Erro ao carregar especialidades'))
  }, [])

  const handleSearch = () => {
    setCity(cityInput)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Buscar Plantões</h1>
        <p className="text-slate-500 text-sm mt-0.5">Encontre plantões disponíveis para se candidatar</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
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

        <Select
          value={turno}
          onValueChange={(val) => {
            setTurno(val === '__all__' ? '' : (val as Turno))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Turno" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Qualquer turno</SelectItem>
            {(Object.keys(turnoLabel) as Turno[]).map((t) => (
              <SelectItem key={t} value={t}>
                {turnoLabel[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            {(Object.keys(compensationLabel) as CompensationType[]).map((c) => (
              <SelectItem key={c} value={c}>
                {compensationLabel[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <PlantaoCard key={i} />)
          : shifts.map((shift) => (
              <PlantaoCard
                key={shift.id}
                shift={shift}
                onApply={() => router.push(`/profissional/plantoes/${shift.id}`)}
              />
            ))}
        {!loading && shifts.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-400">
            Nenhum plantão disponível com esses filtros.
          </div>
        )}
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
