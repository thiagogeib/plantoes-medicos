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
import { EmptyStateIllustration } from '@/components/shared/ui/EmptyStateIllustration'
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { UserPlus, FileWarning, Download, MoreHorizontal, Wallet, Repeat, UserMinus } from 'lucide-react'
import { BulkUploadDialog } from '@/components/shared/bulk/BulkUploadDialog'
import { formatDateOnly } from '@/lib/date-utils'
import type {
  HospitalStaff,
  StaffStatus,
  StaffType,
  ApiError,
  ApiListResponse,
  Absence,
  Specialty,
  ProfessionalCandidate,
} from '@plantoes-medicos/types'

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

const typeLabel: Record<StaffType, string> = {
  FIXO: 'Fixo',
  AVULSO: 'Avulso',
}

const typeVariant: Record<StaffType, 'default' | 'slate'> = {
  FIXO: 'default',
  AVULSO: 'slate',
}

const inviteSchema = z.object({
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos, sem pontuação'),
  type: z.enum(['FIXO', 'AVULSO']),
})
type InviteValues = z.infer<typeof inviteSchema>

function InviteDialog({ open, onClose, onInvited }: {
  open: boolean
  onClose: () => void
  onInvited: () => void
}) {
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { cpf: '', type: 'FIXO' } })
  const type = form.watch('type')

  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [specialtyId, setSpecialtyId] = useState('')
  const [city, setCity] = useState('')
  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState<ProfessionalCandidate[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [invitingId, setInvitingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    apiClient
      .get<ApiListResponse<Specialty>>('/specialties')
      .then((res) => setSpecialties(res.data))
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingCandidates(true)
    const params = new URLSearchParams({ limit: '20' })
    if (specialtyId) params.set('specialtyId', specialtyId)
    if (city) params.set('city', city)
    if (search) params.set('search', search)
    apiClient
      .get<ApiListResponse<ProfessionalCandidate>>(`/staff/candidates?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setCandidates(res.data)
      })
      .catch(() => {
        if (!cancelled) toast.error('Erro ao buscar profissionais')
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, specialtyId, city, search])

  async function inviteCandidate(cpf: string, id: string) {
    setInvitingId(id)
    try {
      await apiClient.post('/staff/invite', { cpf, type })
      toast.success('Convite enviado ao profissional')
      setCandidates((prev) => prev.filter((c) => c.id !== id))
      onInvited()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao enviar convite')
    } finally {
      setInvitingId(null)
    }
  }

  const onSubmitCpf = async (values: InviteValues) => {
    try {
      await apiClient.post('/staff/invite', values)
      toast.success('Convite enviado ao profissional')
      form.setValue('cpf', '')
      onInvited()
      onClose()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao enviar convite')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Convidar profissional</DialogTitle>
          <DialogDescription>
            Busque entre os profissionais cadastrados na plataforma e convide com um clique.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de vínculo (aplicado a quem você convidar)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="FIXO">Fixo — pode pedir troca e folga</SelectItem>
                  <SelectItem value="AVULSO">Avulso — pode pedir apenas troca</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </Form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={specialtyId} onValueChange={(v) => setSpecialtyId(v === '__all__' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Especialidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as especialidades</SelectItem>
              {specialties.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input placeholder="Buscar por nome" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 rounded-lg border border-slate-200 p-2">
          {loadingCandidates ? (
            <p className="text-sm text-slate-400 text-center py-6">Buscando...</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Nenhum profissional encontrado com esses filtros.
            </p>
          ) : (
            candidates.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-2.5">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c.councilType} {c.councilNumber}
                    {c.city && ` · ${c.city}${c.state ? '/' + c.state : ''}`}
                  </p>
                  {c.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.specialties.map((s) => (
                        <Badge key={s.specialty.id} variant="secondary" className="text-[10px]">
                          {s.specialty.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => inviteCandidate(c.cpf, c.id)}
                  disabled={invitingId === c.id}
                >
                  {invitingId === c.id ? 'Convidando...' : 'Convidar'}
                </Button>
              </div>
            ))
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitCpf)} className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">Não encontrou? Convide diretamente pelo CPF:</p>
            <div className="flex gap-2">
              <FormField control={form.control} name="cpf" render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl><Input placeholder="CPF (11 dígitos)" maxLength={11} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" variant="outline" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enviando...' : 'Convidar por CPF'}
              </Button>
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
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

  async function handleExportHours() {
    try {
      await apiClient.downloadFile('/bulk/staff-hours', 'horas-da-equipe.csv')
    } catch {
      toast.error('Erro ao exportar horas da equipe')
    }
  }

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

  async function handleToggleType(s: HospitalStaff) {
    const nextType: StaffType = s.type === 'FIXO' ? 'AVULSO' : 'FIXO'
    try {
      await apiClient.patch(`/staff/${s.id}/type`, { type: nextType })
      toast.success(`Vínculo alterado para ${typeLabel[nextType]}`)
      void load()
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao alterar vínculo')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minha Equipe</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Profissionais vinculados ao seu quadro — habilitados para trocas de plantão e solicitações de folga.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportHours}>
            <Download className="mr-2 h-4 w-4" /> Exportar horas (CSV)
          </Button>
          <BulkUploadDialog
            triggerLabel="Importar horas (CSV)"
            title="Atualizar horas da equipe em massa"
            description="Envie um CSV com CPF, banco de horas e folgas disponíveis para atualizar vários profissionais de uma vez."
            templatePath="/bulk/staff-hours"
            templateFilename="horas-da-equipe.csv"
            uploadPath="/bulk/staff-hours"
            onSuccess={() => void load()}
          />
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Convidar profissional
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Conselho</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead>Banco de horas</TableHead>
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
                  <TableCell>
                    <Badge variant={typeVariant[s.type]}>{typeLabel[s.type]}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {Math.round((s.hourBankMinutes / 60) * 100) / 100}h
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" aria-label="Ações">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setBalanceTarget(s)}>
                          <Wallet className="mr-2 h-3.5 w-3.5" /> Ajustar saldo
                        </DropdownMenuItem>
                        {s.status !== 'INACTIVE' && (
                          <DropdownMenuItem onSelect={() => handleToggleType(s)}>
                            <Repeat className="mr-2 h-3.5 w-3.5" />
                            Marcar como {s.type === 'FIXO' ? 'avulso' : 'fixo'}
                          </DropdownMenuItem>
                        )}
                        {s.status === 'ACTIVE' && (
                          <DropdownMenuItem onSelect={() => setAbsenceTarget(s)}>
                            <FileWarning className="mr-2 h-3.5 w-3.5" /> Afastamento
                          </DropdownMenuItem>
                        )}
                        {s.status !== 'INACTIVE' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => setDeactivateTarget(s)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <UserMinus className="mr-2 h-3.5 w-3.5" /> Remover
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            <Card><CardContent className="py-8 text-center text-slate-400 space-y-2"><EmptyStateIllustration size={72} /><p>Nenhum afastamento registrado ainda.</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {absences.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4 text-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="font-medium text-slate-800">{a.professional?.name}</span>
                      <span className="text-slate-500">
                        {absenceTypeLabel[a.type] ?? a.type} — {formatDateOnly(a.startDate)} a {formatDateOnly(a.endDate)}
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
