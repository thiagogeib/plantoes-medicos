'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { Specialty, ApiListResponse, ApiResponse, Shift, ApiError, Absence } from '@plantoes-medicos/types'
import { compensationOptions } from '@/lib/compensation'

const NO_ABSENCE = '__none__'

const absenceTypeLabel: Record<string, string> = {
  ATESTADO: 'Atestado',
  LICENCA: 'Licença',
  OUTRO: 'Outro',
}

const schema = z.object({
  title: z.string().min(3, 'Título obrigatório'),
  description: z.string().min(10, 'Descrição muito curta'),
  specialtyId: z.string().min(1, 'Especialidade obrigatória'),
  requiredCouncilType: z.enum(['CRM', 'COREN'], {
    errorMap: () => ({ message: 'Selecione o perfil exigido' }),
  }),
  date: z.string().min(1, 'Data obrigatória'),
  startTime: z.string().min(1, 'Horário de início obrigatório'),
  endTime: z.string().min(1, 'Horário de término obrigatório'),
  location: z.string().min(3, 'Local obrigatório'),
  slots: z.coerce.number().min(1, 'Mínimo 1 vaga').max(50, 'Máximo 50 vagas'),
  compensationType: z.enum(['MONEY', 'HOUR_BANK', 'OTHER'], {
    errorMap: () => ({ message: 'Selecione a forma de compensação' }),
  }),
  compensationNote: z.string().max(280, 'Máximo 280 caracteres').optional(),
  coverageForAbsenceId: z.string().optional(),
}).refine(
  (val) => val.compensationType !== 'OTHER' || !!val.compensationNote?.trim(),
  { message: 'Descreva a forma de compensação', path: ['compensationNote'] }
)

type FormValues = z.infer<typeof schema>

export default function EditarPlantaoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      specialtyId: '',
      requiredCouncilType: 'CRM',
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      slots: 1,
      compensationType: 'MONEY',
      compensationNote: '',
      coverageForAbsenceId: NO_ABSENCE,
    },
  })

  const compensationType = form.watch('compensationType')

  useEffect(() => {
    Promise.all([
      apiClient.get<ApiListResponse<Specialty>>('/specialties'),
      apiClient.get<{ data: Absence[] }>('/absences/hospital').catch(() => ({ data: [] })),
      apiClient.get<ApiResponse<Shift>>(`/shifts/${id}`),
    ])
      .then(([specialtiesRes, absencesRes, shiftRes]) => {
        setSpecialties(specialtiesRes.data)
        setAbsences(absencesRes.data)
        const shift = shiftRes.data
        form.reset({
          title: shift.title,
          description: shift.description,
          specialtyId: shift.specialtyId,
          requiredCouncilType: shift.requiredCouncilType,
          date: shift.date.slice(0, 10),
          startTime: shift.startTime,
          endTime: shift.endTime,
          location: shift.location,
          slots: shift.slots,
          compensationType: shift.compensationType,
          compensationNote: shift.compensationNote ?? '',
          coverageForAbsenceId: shift.coverageForAbsenceId ?? NO_ABSENCE,
        })
      })
      .catch(() => toast.error('Erro ao carregar plantão'))
      .finally(() => setLoading(false))
  }, [id, form])

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        coverageForAbsenceId: values.coverageForAbsenceId === NO_ABSENCE ? undefined : values.coverageForAbsenceId,
      }
      await apiClient.patch<ApiResponse<Shift>>(`/shifts/${id}`, payload)
      toast.success('Plantão atualizado com sucesso')
      router.push(`/hospital/plantoes/${id}`)
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao atualizar plantão')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Editar plantão</h1>
        <p className="text-slate-500 text-sm mt-0.5">Altere os dados da vaga</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do plantão</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da vaga</FormLabel>
                    <FormControl>
                      <Input placeholder="Plantão de Pronto-Socorro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva as atividades e requisitos do plantão..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specialtyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialidade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {specialties.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slots"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de vagas</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={50} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="requiredCouncilType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil exigido</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CRM">Médico (CRM)</SelectItem>
                        <SelectItem value="COREN">Enfermeiro (COREN)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do plantão</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário de início</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário de término</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local (setor / ala)</FormLabel>
                    <FormControl>
                      <Input placeholder="UTI Adulto - 3º andar" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="compensationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de compensação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {compensationOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {compensationType === 'OTHER' && (
                <FormField
                  control={form.control}
                  name="compensationNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descreva a modalidade</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex.: permuta com outro setor, bônus por produtividade..."
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="coverageForAbsenceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Este plantão é extra, para cobrir um afastamento? (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_ABSENCE}>Nenhum — plantão normal</SelectItem>
                        {absences.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {absenceTypeLabel[a.type] ?? a.type} — {a.professional?.name} ({a.startDate} a {a.endDate})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
