'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Building2, MapPin, FileWarning } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { HospitalStaff, StaffStatus, StaffType, ApiError, Absence } from '@plantoes-medicos/types'

const absenceTypeLabel: Record<string, string> = {
  ATESTADO: 'Atestado',
  LICENCA: 'Licença',
  OUTRO: 'Outro',
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

function RegisterAbsenceDialog({ hospitalId, hospitalName, onClose, onSaved }: {
  hospitalId: string
  hospitalName?: string
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<AbsenceValues>({
    resolver: zodResolver(absenceSchema),
    defaultValues: { type: 'ATESTADO', startDate: '', endDate: '', note: '' },
  })

  const onSubmit = async (values: AbsenceValues) => {
    try {
      await apiClient.post('/absences', { ...values, hospitalId })
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
          <DialogTitle>Registrar afastamento — {hospitalName}</DialogTitle>
          <DialogDescription>
            Informe atestados, licenças ou outros afastamentos para que apareçam no status diário da escala do hospital.
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

const statusLabel: Record<StaffStatus, string> = {
  INVITED: 'Convite pendente',
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

export default function MeusHospitaisPage() {
  const [links, setLinks] = useState<HospitalStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [absenceTarget, setAbsenceTarget] = useState<HospitalStaff | null>(null)
  const [absences, setAbsences] = useState<Absence[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [linksRes, absencesRes] = await Promise.all([
        apiClient.get<{ data: HospitalStaff[] }>('/staff/me'),
        apiClient.get<{ data: Absence[] }>('/absences/mine').catch(() => ({ data: [] })),
      ])
      setLinks(linksRes.data)
      setAbsences(absencesRes.data)
    } catch {
      toast.error('Erro ao carregar hospitais')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function respond(id: string, accept: boolean) {
    setRespondingId(id)
    try {
      await apiClient.patch(`/staff/${id}/respond`, { accept })
      toast.success(accept ? 'Convite aceito' : 'Convite recusado')
      void load()
    } catch {
      toast.error('Erro ao responder convite')
    } finally {
      setRespondingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meus Hospitais</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Hospitais onde você faz parte do quadro fixo — habilita trocas de plantão e solicitações de folga.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Você ainda não foi convidado por nenhum hospital. Quando um hospital te adicionar ao quadro pelo CPF, o convite aparecerá aqui.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <Card key={link.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold text-slate-900">{link.hospital?.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{link.hospital?.city}/{link.hospital?.state}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 items-center shrink-0">
                    <Badge variant={link.type === 'FIXO' ? 'default' : 'slate'}>{typeLabel[link.type]}</Badge>
                    <Badge variant={statusVariant[link.status]}>{statusLabel[link.status]}</Badge>
                  </div>
                </div>

                {link.status === 'ACTIVE' && (
                  <>
                    {link.type === 'AVULSO' && (
                      <p className="text-sm text-slate-500 mt-3">
                        Como plantonista avulso, você pode oferecer plantões aceitos para troca, mas não solicitar folga.
                      </p>
                    )}
                    <div className="flex gap-6 mt-4 text-sm text-slate-600">
                      <div>
                        <span className="text-slate-400">Banco de horas: </span>
                        <span className="font-medium">{Math.round((link.hourBankMinutes / 60) * 100) / 100}h</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Folgas disponíveis: </span>
                        <span className="font-medium">{link.availableDaysOff}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setAbsenceTarget(link)}>
                      <FileWarning className="mr-2 h-4 w-4" /> Registrar afastamento
                    </Button>
                  </>
                )}

                {link.status === 'INVITED' && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => respond(link.id, true)}
                      disabled={respondingId === link.id}
                    >
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => respond(link.id, false)}
                      disabled={respondingId === link.id}
                    >
                      Recusar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Meus afastamentos</h2>
          {absences.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-slate-400">Nenhum afastamento registrado ainda.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {absences.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4 text-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="font-medium text-slate-800">{absenceTypeLabel[a.type] ?? a.type}</span>
                      <span className="text-slate-500">
                        {format(new Date(a.startDate), 'dd/MM/yyyy', { locale: ptBR })} a {format(new Date(a.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="text-slate-400 mt-0.5">{a.hospital?.name}</div>
                    {a.note && <p className="text-slate-500 mt-1">{a.note}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {absenceTarget && (
        <RegisterAbsenceDialog
          hospitalId={absenceTarget.hospitalId}
          hospitalName={absenceTarget.hospital?.name}
          onClose={() => setAbsenceTarget(null)}
          onSaved={() => void load()}
        />
      )}
    </div>
  )
}
