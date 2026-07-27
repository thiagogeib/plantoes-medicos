'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { UserPlus, FileWarning } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { HospitalStaff, StaffStatus, ApiError, ApiListResponse, Absence } from '@plantoes-medicos/types'

const absenceTypeLabel: Record<string, string> = {
  ATESTADO: 'Atestado',
  LICENCA: 'Licença',
  OUTRO: 'Outro',
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

const inviteSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos, sem pontuação'),
})
type InviteValues = z.infer<typeof inviteSchema>

function InviteDialog({ open, onClose, onInvited }: {
  open: boolean
  onClose: () => void
  onInvited: () => void
}) {
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { cpf: '' } })

  const onSubmit = async (values: InviteValues) => {
    try {
      await apiClient.post('/staff/invite', values)
      toast.success('Convite enviado ao profissional')
      form.reset()
      onInvited()
      onClose()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao enviar convite')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar profissional</DialogTitle>
          <DialogDescription>
            Informe o CPF do profissional já cadastrado na plataforma para adicioná-lo ao seu quadro.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="cpf" render={({ field }) => (
              <FormItem>
                <FormLabel>CPF (11 dígitos)</FormLabel>
                <FormControl><Input placeholder="00000000000" maxLength={11} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enviando...' : 'Enviar convite'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const balanceSchema = z.object({
  hours: z.coerce.number().min(0, 'Não pode ser negativo'),
  availableDaysOff: z.coerce.number().int().min(0, 'Não pode ser negativo'),
})
type BalanceValues = z.infer<typeof balanceSchema>

function BalanceDialog({ staff, onClose, onSaved }: {
  staff: HospitalStaff
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<BalanceValues>({
    resolver: zodResolver(balanceSchema),
    defaultValues: {
      hours: Math.round((staff.hourBankMinutes / 60) * 100) / 100,
      availableDaysOff: staff.availableDaysOff,
    },
  })

  const onSubmit = async (values: BalanceValues) => {
    try {
      await apiClient.patch(`/staff/${staff.id}/balance`, {
        hourBankMinutes: Math.round(values.hours * 60),
        availableDaysOff: values.availableDaysOff,
      })
      toast.success('Saldo atualizado')
      onSaved()
      onClose()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao atualizar saldo')
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar saldo — {staff.professional?.name}</DialogTitle>
          <DialogDescription>Ajuste manual do banco de horas e folgas disponíveis.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="hours" render={({ field }) => (
              <FormItem>
                <FormLabel>Banco de horas (horas)</FormLabel>
                <FormControl><Input type="number" step="0.5" min={0} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="availableDaysOff" render={({ field }) => (
              <FormItem>
                <FormLabel>Folgas disponíveis</FormLabel>
                <FormControl><Input type="number" min={0} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const absenceSchema = z
  .object({
    type: z.enum(['ATESTADO', 'LICENCA', 'OUTRO'], {
      errorMap: () => ({ message: 'Selecione o tipo de afastamento' }),
    }),
    startDate: z.string().min(1, 'Data inicial obrigatória'),
    endDate: z.string().min(1, 'Data final obrigatória'),
    note: z.string().max(280, 'Máximo 280 caracteres').optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'Data final deve ser igual ou posterior à inicial',
    path: ['endDate'],
  })
type AbsenceValues = z.infer<typeof absenceSchema>

function RegisterAbsenceDialog({ staff, onClose, onSaved }: {
  staff: HospitalStaff
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<AbsenceValues>({
    resolver: zodResolver(absenceSchema),
    defaultValues: { type: 'ATESTADO', startDate: '', endDate: '', note: '' },
  })

  const onSubmit = async (values: AbsenceValues) => {
    try {
      await apiClient.post('/absences/hospital', { ...values, professionalId: staff.professionalId })
      toast.success('Afastamento registrado')
      onSaved()
      onClose()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao registrar afastamento')
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar afastamento — {staff.professional?.name}</DialogTitle>
          <DialogDescription>
            Aparecerá no status diário da escala nas datas informadas.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="ATESTADO">Atestado</SelectItem>
                    <SelectItem value="LICENCA">Licença</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Início</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fim</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Observação (opcional)</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default function EquipePage() {
  const [staff, setStaff] = useState<HospitalStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [balanceTarget, setBalanceTarget] = useState<HospitalStaff | null>(null)
  const [absenceTarget, setAbsenceTarget] = useState<HospitalStaff | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<HospitalStaff | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [absences, setAbsences] = useState<Absence[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [staffRes, absencesRes] = await Promise.all([
        apiClient.get<ApiListResponse<HospitalStaff>>('/staff/hospital?limit=100'),
        apiClient.get<{ data: Absence[] }>('/absences/hospital').catch(() => ({ data: [] })),
      ])
      setStaff(staffRes.data)
      setAbsences(absencesRes.data)
    } catch {
      toast.error('Erro ao carregar equipe')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setActionLoading(true)
    try {
      await apiClient.patch(`/staff/${deactivateTarget.id}/deactivate`, {})
      toast.success('Profissional removido do quadro')
      setDeactivateTarget(null)
      void load()
    } catch {
      toast.error('Erro ao remover profissional')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minha Equipe</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Profissionais vinculados ao seu quadro — habilitados para trocas de plantão e solicitações de folga.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="shrink-0">
          <UserPlus className="mr-2 h-4 w-4" /> Convidar profissional
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Conselho</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Banco de horas</TableHead>
              <TableHead>Folgas</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                  Nenhum profissional no quadro ainda. Convide pelo CPF.
                </TableCell>
              </TableRow>
            ) : (
              staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-slate-900">{s.professional?.name}</TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {s.professional?.councilType} {s.professional?.councilNumber}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {Math.round((s.hourBankMinutes / 60) * 100) / 100}h
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">{s.availableDaysOff}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setBalanceTarget(s)}>
                      Ajustar saldo
                    </Button>
                    {s.status === 'ACTIVE' && (
                      <Button size="sm" variant="outline" onClick={() => setAbsenceTarget(s)}>
                        <FileWarning className="mr-1.5 h-3.5 w-3.5" /> Afastamento
                      </Button>
                    )}
                    {s.status !== 'INACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => setDeactivateTarget(s)}
                      >
                        Remover
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Afastamentos registrados</h2>
          {absences.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-slate-400">Nenhum afastamento registrado ainda.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {absences.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4 text-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="font-medium text-slate-800">{a.professional?.name}</span>
                      <span className="text-slate-500">
                        {absenceTypeLabel[a.type] ?? a.type} — {format(new Date(a.startDate), 'dd/MM/yyyy', { locale: ptBR })} a {format(new Date(a.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    {a.note && <p className="text-slate-500 mt-1">{a.note}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={() => void load()} />

      {balanceTarget && (
        <BalanceDialog
          staff={balanceTarget}
          onClose={() => setBalanceTarget(null)}
          onSaved={() => void load()}
        />
      )}

      {absenceTarget && (
        <RegisterAbsenceDialog
          staff={absenceTarget}
          onClose={() => setAbsenceTarget(null)}
          onSaved={() => void load()}
        />
      )}

      <Dialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover do quadro</DialogTitle>
            <DialogDescription>
              {deactivateTarget?.professional?.name} deixará de fazer parte do seu quadro e não poderá mais participar de trocas ou coberturas neste hospital.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={actionLoading}>
              {actionLoading ? 'Removendo...' : 'Confirmar remoção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
