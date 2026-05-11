'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useHospitalShifts } from '@/hooks/use-hospital-shifts'
import { PlantaoCard } from '@/components/shared/plantao/PlantaoCard'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { ShiftStatus } from '@plantoes-medicos/types'

const STATUS_OPTIONS: { value: ShiftStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'OPEN', label: 'Aberto' },
  { value: 'FILLED', label: 'Preenchido' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

export default function HospitalPlantoesPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | ''>('')
  const [page, setPage] = useState(1)

  const { shifts, totalPages, loading } = useHospitalShifts({
    status: statusFilter,
    page,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plantões</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie os plantões do seu hospital</p>
        </div>
        <Button onClick={() => router.push('/hospital/plantoes/novo')}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo plantão
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val as ShiftStatus | '')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value || '__all__'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <PlantaoCard key={i} />)
          : shifts.map((shift) => (
              <PlantaoCard
                key={shift.id}
                shift={shift}
                onViewCandidates={() => router.push(`/hospital/plantoes/${shift.id}`)}
              />
            ))}
        {!loading && shifts.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-400">
            Nenhum plantão encontrado com esse filtro.
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
