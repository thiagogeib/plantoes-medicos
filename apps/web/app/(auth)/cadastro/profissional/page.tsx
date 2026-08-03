'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { formatCPF, formatPhone } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import type { ApiError, Specialty, ApiListResponse } from '@plantoes-medicos/types'

const schema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
    name: z.string().min(2, 'Nome obrigatório'),
    cpf: z.string().min(14, 'CPF inválido'),
    phone: z.string().min(14, 'Telefone inválido'),
    councilType: z.enum(['CRM', 'COREN'], { required_error: 'Selecione o conselho' }),
    councilNumber: z.string().min(1, 'Número do conselho obrigatório'),
    councilState: z.string().length(2, 'UF deve ter 2 letras'),
    city: z.string().optional(),
    state: z.string().max(2, 'UF deve ter 2 letras').optional(),
    zipCode: z.string().optional(),
    specialtyIds: z.array(z.string()).min(1, 'Selecione ao menos uma especialidade'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

const STEP_FIELDS: Array<Array<keyof FormValues>> = [
  ['email', 'password', 'confirmPassword'],
  ['name', 'cpf', 'phone', 'councilType', 'councilNumber', 'councilState', 'city', 'state', 'zipCode', 'specialtyIds'],
]

export default function CadastroProfissionalPage() {
  const [step, setStep] = useState(0)
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [loadingSpecialties, setLoadingSpecialties] = useState(false)
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      cpf: '',
      phone: '',
      councilType: undefined,
      councilNumber: '',
      councilState: '',
      city: '',
      state: '',
      zipCode: '',
      specialtyIds: [],
    },
  })

  useEffect(() => {
    if (step === 1) {
      setLoadingSpecialties(true)
      apiClient
        .get<ApiListResponse<Specialty>>('/specialties')
        .then((res) => setSpecialties(res.data))
        .catch(() => toast.error('Erro ao carregar especialidades'))
        .finally(() => setLoadingSpecialties(false))
    }
  }, [step])

  const handleNextStep = async () => {
    const valid = await form.trigger(STEP_FIELDS[step] as Array<keyof FormValues>)
    if (valid) setStep(1)
  }

  const toggleSpecialty = (id: string) => {
    const current = form.getValues('specialtyIds')
    if (current.includes(id)) {
      form.setValue('specialtyIds', current.filter((s) => s !== id), { shouldValidate: true })
    } else {
      form.setValue('specialtyIds', [...current, id], { shouldValidate: true })
    }
  }

  const onSubmit = async (values: FormValues) => {
    try {
      const { confirmPassword, ...payload } = values
      void confirmPassword
      await apiClient.post('/auth/register/professional', {
        ...payload,
        cpf: payload.cpf.replace(/\D/g, ''),
        phone: payload.phone.replace(/\D/g, ''),
        zipCode: payload.zipCode ? payload.zipCode : undefined,
      })
      toast.success('Profissional cadastrado! Faça o login para continuar.')
      router.push('/login')
    } catch (err) {
      const error = err as ApiError
      toast.error(error?.error?.message ?? 'Erro ao cadastrar profissional')
    }
  }

  const selectedIds = form.watch('specialtyIds')

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Cadastrar Profissional</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Etapa {step + 1} de 2 — {step === 0 ? 'Dados da conta' : 'Dados profissionais'}
        </p>
      </div>

      <div className="flex gap-2 mb-2">
        <div className={`flex-1 h-1.5 rounded-full ${step >= 0 ? 'bg-blue-600' : 'bg-slate-200'}`} />
        <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {step === 0 ? 'Dados de acesso' : 'Informações profissionais'}
          </CardTitle>
          <CardDescription>
            {step === 0
              ? 'Email e senha para acessar a plataforma'
              : 'Dados do conselho e especialidades'}
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
                          <Input type="email" placeholder="medico@email.com" {...field} />
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
                        <FormLabel>Nome completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. João Silva" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000.000.000-00"
                              {...field}
                              onChange={(e) =>
                                field.onChange(formatCPF(e.target.value))
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
                      name="councilType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conselho</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CRM">CRM</SelectItem>
                              <SelectItem value="COREN">COREN</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="councilNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="councilState"
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
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Cidade (opcional)</FormLabel>
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
                        <FormLabel>CEP (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Só números"
                            maxLength={8}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                          />
                        </FormControl>
                        <p className="text-xs text-slate-500">Usado para mostrar plantões próximos de você.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialtyIds"
                    render={() => (
                      <FormItem>
                        <FormLabel>Especialidades</FormLabel>
                        {loadingSpecialties ? (
                          <p className="text-sm text-slate-400">Carregando especialidades...</p>
                        ) : (
                          <>
                            {selectedIds.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {selectedIds.map((id) => {
                                  const sp = specialties.find((s) => s.id === id)
                                  return (
                                    <Badge key={id} variant="default" className="gap-1">
                                      {sp?.name}
                                      <button
                                        type="button"
                                        onClick={() => toggleSpecialty(id)}
                                        aria-label={`Remover ${sp?.name}`}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  )
                                })}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                              {specialties.map((sp) => (
                                <button
                                  type="button"
                                  key={sp.id}
                                  onClick={() => toggleSpecialty(sp.id)}
                                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                    selectedIds.includes(sp.id)
                                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                  }`}
                                >
                                  {sp.name}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
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
        <Link href="/login" className="text-blue-600 font-medium hover:underline">
          Fazer login
        </Link>
      </p>
    </div>
  )
}
