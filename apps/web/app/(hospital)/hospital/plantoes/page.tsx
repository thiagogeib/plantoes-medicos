'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { useHospitalShifts } from '@/hooks/use-hospital-shifts'
import { PlantaoCard } from '@/components/shared/plantao/PlantaoCard'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { BulkUploadDialog } from '@/components/shared/bulk/BulkUploadDialog'
import type { ShiftStatus, Shift, ApiError } from '@plantoes-medicos/types'

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

  const { shifts, totalPages, loading, reload } = useHospitalShifts({
    status: statusFilter,
    page,
  })

  const [confirmTarget, setConfirmTarget] = useState<{ shift: Shift; action: 'delete' | 'cancel' } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  async function handleConfirm() {
    if (!confirmTarget) return
    setConfirmLoading(true)
    try {
      if (confirmTarget.action === 'delete') {
        await apiClient.del(`/shifts/${confirmTarget.shift.id}/permanent`)
        toast.success('Plantão excluído permanentemente')
      } else {
        await apiClient.del(`/shifts/${confirmTarget.shift.id}`)
        toast.success('Plantão cancelado')
      }
      setConfirmTarget(null)
      void reload()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao processar ação')
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plantões</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie os plantões do seu hospital</p>
        </div>
        <div className="flex gap-2">
          <BulkUploadDialog
            triggerLabel="Upload em massa"
            title="Publicar plantões em massa"
            description="Envie um arquivo CSV com vários plantões de uma vez. Baixe o modelo, preencha e envie."
            templatePath="/bulk/shifts/template"
            templateFilename="modelo-plantoes.csv"
            uploadPath="/bulk/shifts"
            onSuccess={() => reload()}
          />
          <Button onClick={() => router.push('/hospital/plantoes/novo')}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo plantão
          </Button>
        </div>
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
                onEdit={
                  shift.status === 'OPEN' || shift.status === 'FILLED'
                    ? () => router.push(`/hospital/plantoes/${shift.id}/editar`)
                    : undefined
                }
                onDelete={
                  shift.filledSlots === 0
                    ? () => setConfirmTarget({ shift, action: 'delete' })
                    : undefined
                }
                onCancel={
                  shift.filledSlots > 0 && shift.status === 'OPEN'
                    ? () => setConfirmTarget({ shift, action: 'cancel' })
                    : undefined
                }
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

      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmTarget?.action === 'delete' ? 'Excluir plantão permanentemente' : 'Cancelar plantão'}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.action === 'delete'
                ? 'Como este plantão ainda não tem nenhuma candidatura aceita, ele pode ser excluído por completo — inclusive candidaturas pendentes serão removidas junto. Essa ação não pode ser desfeita.'
                : 'Este plantão já tem candidatura aceita, então não pode ser excluído — apenas cancelado. Os candidatos serão notificados do cancelamento.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>Voltar</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={confirmLoading}>
              {confirmLoading
                ? 'Processando...'
                : confirmTarget?.action === 'delete' ? 'Excluir permanentemente' : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
