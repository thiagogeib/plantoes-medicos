'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import type { ApiError, Specialty, ApiListResponse } from '@plantoes-medicos/types'

const schema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Obrigatório'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF: 11 dígitos sem pontuação'),
  phone: z.string().min(1, 'Obrigatório'),
  councilType: z.enum(['CRM', 'COREN']),
  councilNumber: z.string().min(1, 'Obrigatório'),
  councilState: z.string().length(2, 'UF: 2 letras'),
  city: z.string().optional(),
  state: z.string().max(2, 'UF: 2 letras').optional(),
  zipCode: z.string().regex(/^\d{8}$/, 'CEP: 8 dígitos sem traço').optional().or(z.literal('')),
  specialtyIds: z.array(z.string()).min(1, 'Selecione ao menos uma especialidade'),
})
type FormValues = z.infer<typeof schema>

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface MeResponse {
  data: {
    user: {
      email: string
      professionalProfile: {
        name: string; cpf: string; phone: string
        councilType: 'CRM' | 'COREN'; councilNumber: string; councilState: string
        city?: string; state?: string; zipCode?: string
        specialties: { specialty: { id: string; name: string } }[]
      } | null
    }
  }
}

export default function PerfilProfissionalPage() {
  const [loading, setLoading] = useState(true)
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    Promise.all([
      apiClient.get<MeResponse>('/auth/me'),
      apiClient.get<ApiListResponse<Specialty>>('/specialties'),
    ])
      .then(([meRes, specsRes]) => {
        setSpecialties(specsRes.data)
        const { user } = meRes.data
        const p = user.professionalProfile
        if (!p) return
        form.reset({
          email: user.email,
          name: p.name, cpf: p.cpf, phone: p.phone,
          councilType: p.councilType, councilNumber: p.councilNumber, councilState: p.councilState,
          city: p.city ?? '', state: p.state ?? '', zipCode: p.zipCode ?? '',
          specialtyIds: p.specialties.map((s) => s.specialty.id),
        })
      })
      .catch(() => toast.error('Erro ao carregar perfil'))
      .finally(() => setLoading(false))
  }, [form])

  const onSubmit = async (values: FormValues) => {
    try {
      await apiClient.patch('/professionals/me', {
        ...values,
        zipCode: values.zipCode ? values.zipCode : undefined,
      })
      toast.success('Perfil atualizado com sucesso')
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao atualizar perfil')
    }
  }

  const name = form.watch('name')
  const councilType = form.watch('councilType')
  const councilNumber = form.watch('councilNumber')
  const councilState = form.watch('councilState')
  const specialtyCount = form.watch('specialtyIds')?.length ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
        <p className="text-slate-500 text-sm mt-0.5">Seus dados exibidos na plataforma</p>
      </div>

      {!loading && (
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-lg font-semibold">
                {getInitials(name || '?')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{name || 'Sem nome'}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {councilType && councilNumber && (
                  <Badge variant="secondary" className="text-xs">
                    {councilType} {councilNumber}{councilState ? `/${councilState}` : ''}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {specialtyCount} especialidade{specialtyCount !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações profissionais</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Nome completo</FormLabel>
                      <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Telefone</FormLabel>
                      <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="cpf" render={({ field }) => (
                    <FormItem><FormLabel>CPF (11 dígitos)</FormLabel>
                      <FormControl><Input maxLength={11} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="councilType" render={({ field }) => (
                    <FormItem><FormLabel>Conselho</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="CRM">CRM</SelectItem>
                          <SelectItem value="COREN">COREN</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="councilNumber" render={({ field }) => (
                    <FormItem><FormLabel>Número do conselho</FormLabel>
                      <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="councilState" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Estado do conselho (UF)</FormLabel>
                      <FormControl><Input maxLength={2} className="w-24" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>Cidade (opcional)</FormLabel>
                      <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem><FormLabel>UF da cidade</FormLabel>
                      <FormControl><Input maxLength={2} className="w-24" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="zipCode" render={({ field }) => (
                    <FormItem><FormLabel>CEP (opcional)</FormLabel>
                      <FormControl><Input maxLength={8} placeholder="Só números" {...field} /></FormControl>
                      <p className="text-xs text-slate-500">Usado para mostrar plantões próximos de você.</p>
                      <FormMessage /></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="specialtyIds" render={() => (
                  <FormItem>
                    <FormLabel>Especialidades</FormLabel>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 max-h-48 overflow-y-auto">
                      {specialties.map((s) => (
                        <FormField key={s.id} control={form.control} name="specialtyIds" render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(s.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) field.onChange([...(field.value ?? []), s.id])
                                  else field.onChange(field.value?.filter((v) => v !== s.id))
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal text-sm cursor-pointer">{s.name}</FormLabel>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar alterações'}
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
