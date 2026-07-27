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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { ApiError } from '@plantoes-medicos/types'

const schema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Obrigatório'),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ: 14 dígitos sem pontuação'),
  phone: z.string().min(1, 'Obrigatório'),
  street: z.string().min(1, 'Obrigatório'),
  number: z.string().min(1, 'Obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Obrigatório'),
  city: z.string().min(1, 'Obrigatório'),
  state: z.string().length(2, 'UF: 2 letras'),
  zipCode: z.string().regex(/^\d{8}$/, 'CEP: 8 dígitos sem traço'),
})
type FormValues = z.infer<typeof schema>

interface MeResponse {
  data: {
    user: {
      email: string
      hospitalProfile: {
        name: string; cnpj: string; phone: string
        street: string; number: string; complement?: string | null
        neighborhood: string; city: string; state: string; zipCode: string
      } | null
    }
  }
}

export default function PerfilHospitalPage() {
  const [loading, setLoading] = useState(true)
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    apiClient.get<MeResponse>('/auth/me')
      .then((res) => {
        const { user } = res.data
        const p = user.hospitalProfile
        if (!p) return
        form.reset({
          email: user.email,
          name: p.name, cnpj: p.cnpj, phone: p.phone,
          street: p.street, number: p.number, complement: p.complement ?? '',
          neighborhood: p.neighborhood, city: p.city, state: p.state, zipCode: p.zipCode,
        })
      })
      .catch(() => toast.error('Erro ao carregar perfil'))
      .finally(() => setLoading(false))
  }, [form])

  const onSubmit = async (values: FormValues) => {
    try {
      await apiClient.patch('/hospitals/me', values)
      toast.success('Perfil atualizado com sucesso')
    } catch (err) {
      toast.error((err as ApiError)?.error?.message ?? 'Erro ao atualizar perfil')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
        <p className="text-slate-500 text-sm mt-0.5">Dados do hospital exibidos na plataforma</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do hospital</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Nome do hospital</FormLabel>
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
                  <FormField control={form.control} name="cnpj" render={({ field }) => (
                    <FormItem><FormLabel>CNPJ (14 dígitos)</FormLabel>
                      <FormControl><Input maxLength={14} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="zipCode" render={({ field }) => (
                    <FormItem><FormLabel>CEP (8 dígitos)</FormLabel>
                      <FormControl><Input maxLength={8} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="street" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Rua</FormLabel>
                      <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="number" render={({ field }) => (
                    <FormItem><FormLabel>Número</FormLabel>
                      <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="complement" render={({ field }) => (
                    <FormItem><FormLabel>Complemento</FormLabel>
                      <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="neighborhood" render={({ field }) => (
                    <FormItem><FormLabel>Bairro</FormLabel>
                      <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>Cidade</FormLabel>
                      <FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem><FormLabel>UF</FormLabel>
                      <FormControl><Input maxLength={2} className="w-24" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
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
