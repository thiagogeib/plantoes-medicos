'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useMyApplications } from '@/hooks/use-my-applications'
import { CandidaturaCard } from '@/components/shared/candidatura/CandidaturaCard'
import { EmptyStateIllustration } from '@/components/shared/ui/EmptyStateIllustration'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api-client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ApplicationStatus, ApiError } from '@plantoes-medicos/types'

const STATUS_OPTIONS: { value: ApplicationStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PENDING_CONFIRMATION', label: 'Aguardando confirmação' },
  { value: 'ACCEPTED', label: 'Confirmado' },
  { value: 'REJECTED', label: 'Recusado' },
  { value: 'WITHDRAWN', label: 'Retirado' },
]

interface ConfirmResponse {
  data: { checkoutUrl: string }
}

export default function CandidaturasPage() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('')
  const [page, setPage] = useState(1)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const { applications, totalPages, loading } = useMyApplications({
    status: statusFilter,
    page,
  })

  async function handleConfirm(id: string) {
    setConfirmingId(id)
    try {
      const res = await apiClient.post<ConfirmResponse>(`/applications/${id}/confirm`, {})
      window.location.href = res.data.checkoutUrl
    } catch (err) {
      const error = err as ApiError
      if (error?.error?.code === 'PAYMENT_NOT_CONFIGURED') {
        toast.error('O pagamento da taxa de confirmação ainda não está disponível. Tente novamente mais tarde.')
      } else {
        toast.error(error?.error?.message ?? 'Erro ao iniciar a confirmação')
      }
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Minhas Candidaturas</h1>
        <p className="text-slate-500 text-sm mt-0.5">Acompanhe o status das suas candidaturas</p>
      </div>

      <div>
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val === '__all__' ? '' : (val as ApplicationStatus))
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
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 space-y-2 border border-dashed border-slate-200 rounded-xl">
          <EmptyStateIllustration size={80} />
          <p className="text-slate-400">Nenhuma candidatura encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <CandidaturaCard
              key={app.id}
              application={app}
              variant="profissional"
              onConfirm={handleConfirm}
              confirmLoading={confirmingId === app.id}
            />
          ))}
        </div>
      )}

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
