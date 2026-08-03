'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { ApiError } from '@plantoes-medicos/types'

const DEFAULT_MESSAGE_PLACEHOLDER =
  'Agradecemos seu interesse, mas o plantão foi preenchido por outro profissional.'

const schema = z.object({
  defaultRejectionMessage: z.string().max(500, 'Máximo 500 caracteres').optional(),
  leaveCoverageDeadlineDays: z.coerce.number().int().min(1, 'Mínimo 1 dia').max(30, 'Máximo 30 dias'),
  longLeaveThresholdHours: z.coerce.number().min(1, 'Mínimo 1 hora').max(40, 'Máximo 40 horas'),
})
type FormValues = z.infer<typeof schema>

interface MeResponse {
  data: {
    user: {
      hospitalProfile: {
        defaultRejectionMessage?: string
        leaveCoverageDeadlineDays?: number
        longLeaveThresholdMinutes?: number
      } | null
    }
  }
}

export default function ConfiguracoesHospitalPage() {
  const [loading, setLoading] = useState(true)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { defaultRejectionMessage: '', leaveCoverageDeadlineDays: 3, longLeaveThresholdHours: 12 },
  })

  useEffect(() => {
    apiClient
      .get<MeResponse>('/auth/me')
      .then((res) => {
        const p = res.data.user.hospitalProfile
        form.reset({
          defaultRejectionMessage: p?.defaultRejectionMessage ?? '',
          leaveCoverageDeadlineDays: p?.leaveCoverageDeadlineDays ?? 3,
          longLeaveThresholdHours: (p?.longLeaveThresholdMinutes ?? 720) / 60,
        })
      })
      .catch(() => toast.error('Erro ao carregar configurações'))
      .finally(() => setLoading(false))
  }, [form])

  const onSubmit = async (values: FormValues) => {
    try {
      await apiClient.patch('/hospitals/me', {
        defaultRejectionMessage: values.defaultRejectionMessage,
        leaveCoverageDeadlineDays: values.leaveCoverageDeadlineDays,
        longLeaveThresholdMinutes: Math.round(values.longLeaveThresholdHours * 60),
      })
      toast.success('Configurações salvas')
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao salvar configurações')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 text-sm mt-0.5">Preferências gerais do seu hospital na plataforma</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Folgas e cobertura</CardTitle>
          <CardDescription>
            Toda folga solicitada abre automaticamente uma vaga de cobertura. Configure aqui o prazo
            para essa vaga expirar sem candidato e o limiar a partir do qual ela é destacada como
            &quot;folga longa&quot; nas telas de folgas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leaveCoverageDeadlineDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo para expirar sem candidato (dias)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={30} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longLeaveThresholdHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limiar de &quot;folga longa&quot; (horas)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={40} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recusa automática de candidatos</CardTitle>
          <CardDescription>
            Quando você aceita um candidato e a última vaga do plantão é preenchida, os demais
            candidatos pendentes daquele plantão são recusados automaticamente com esta mensagem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="defaultRejectionMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem padrão de recusa</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder={DEFAULT_MESSAGE_PLACEHOLDER} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
