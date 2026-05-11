'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useHospitalShifts } from '@/hooks/use-hospital-shifts'
import { PlantaoCard } from '@/components/shared/plantao/PlantaoCard'
import { Button } from '@/components/ui/button'

export default function HospitalHistoricoPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)

  const { shifts, totalPages, loading } = useHospitalShifts({
    status: 'COMPLETED',
    page,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Histórico</h1>
        <p className="text-slate-500 text-sm mt-0.5">Plantões concluídos</p>
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
            Nenhum plantão concluído ainda.
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
