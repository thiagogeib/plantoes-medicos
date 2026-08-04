'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { formatCNPJ, formatPhone, formatCEP } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { ApiError } from '@plantoes-medicos/types'

const schema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
    name: z.string().min(2, 'Nome obrigatório'),
    cnpj: z.string().min(18, 'CNPJ inválido'),
    phone: z.string().min(14, 'Telefone inválido'),
    street: z.string().min(2, 'Rua obrigatória'),
    number: z.string().min(1, 'Número obrigatório'),
    complement: z.string().optional(),
    neighborhood: z.string().min(2, 'Bairro obrigatório'),
    city: z.string().min(2, 'Cidade obrigatória'),
    state: z.string().length(2, 'UF deve ter 2 letras'),
    zipCode: z.string().min(8, 'CEP inválido'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

const STEP_FIELDS: Array<Array<keyof FormValues>> = [
  ['email', 'password', 'confirmPassword'],
  ['name', 'cnpj', 'phone', 'street', 'number', 'neighborhood', 'city', 'state', 'zipCode'],
]

export default function CadastroHospitalPage() {
  const [step, setStep] = useState(0)
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      cnpj: '',
      phone: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
    },
  })

  const handleNextStep = async () => {
    const valid = await form.trigger(STEP_FIELDS[step] as Array<keyof FormValues>)
    if (valid) setStep(1)
  }

  const onSubmit = async (values: FormValues) => {
    try {
      const { confirmPassword, ...payload } = values
      void confirmPassword
      await apiClient.post('/auth/register/hospital', {
        ...payload,
        cnpj: payload.cnpj.replace(/\D/g, ''),
        phone: payload.phone.replace(/\D/g, ''),
        zipCode: payload.zipCode.replace(/\D/g, ''),
      })
      toast.success('Hospital cadastrado! Confirme seu e-mail para poder entrar.')
      router.push('/login')
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao cadastrar hospital')
    }
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Cadastrar Hospital</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Etapa {step + 1} de 2 — {step === 0 ? 'Dados da conta' : 'Dados do hospital'}
        </p>
      </div>

      <div className="flex gap-2 mb-2">
        <div className={`flex-1 h-1.5 rounded-full ${step >= 0 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
        <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {step === 0 ? 'Dados de acesso' : 'Informações do hospital'}
          </CardTitle>
          <CardDescription>
            {step === 0
              ? 'Email e senha para acessar a plataforma'
              : 'Dados cadastrais e endereço do hospital'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {step === 0 && (
                <>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="hospital@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Repita a senha" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" className="w-full" onClick={handleNextStep}>
                    Próxima etapa <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </>
              )}

              {step === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do hospital</FormLabel>
                        <FormControl>
                          <Input placeholder="Hospital São Lucas" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="00.000.000/0000-00"
                              {...field}
                              onChange={(e) =>
                                field.onChange(formatCNPJ(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(11) 99999-9999"
                              {...field}
                              onChange={(e) =>
                                field.onChange(formatPhone(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Rua</FormLabel>
                          <FormControl>
                            <Input placeholder="Av. Brasil" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="complement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Bloco A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input placeholder="Centro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="São Paulo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UF</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="SP"
                              maxLength={2}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00000-000"
                            {...field}
                            onChange={(e) =>
                              field.onChange(formatCEP(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(0)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? 'Cadastrando...' : 'Finalizar cadastro'}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <Link href="/login" className="text-indigo-600 font-medium hover:underline">
          Fazer login
        </Link>
      </p>
    </div>
  )
}
