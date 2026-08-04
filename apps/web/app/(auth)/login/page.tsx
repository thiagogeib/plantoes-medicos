'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { apiClient } from '@/lib/api-client'
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
import type { LoginResponse, ApiError } from '@plantoes-medicos/types'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type FormValues = z.infer<typeof schema>

const dashboardMap: Record<string, string> = {
  HOSPITAL: '/hospital/dashboard',
  PROFESSIONAL: '/profissional/dashboard',
  ADMIN: '/admin/dashboard',
}

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: FormValues) => {
    setUnverifiedEmail(null)
    try {
      const response = await apiClient.post<{ data: LoginResponse }>(
        '/auth/login',
        values
      )
      setAuth(response.data.accessToken, response.data.user)
      toast.success('Login realizado com sucesso')
      router.push(dashboardMap[response.data.user.role] ?? '/login')
    } catch (err) {
      const error = err as ApiError
      if (error?.error?.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(values.email)
      }
      toast.error(error?.error?.message ?? 'Email ou senha incorretos')
    }
  }

  const handleResend = async () => {
    if (!unverifiedEmail) return
    setResending(true)
    try {
      await apiClient.post('/auth/resend-verification', { email: unverifiedEmail })
      toast.success('Reenviamos o link de confirmação para o seu e-mail.')
    } catch {
      toast.error('Erro ao reenviar o link de confirmação')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Entrar na plataforma</h1>
        <p className="text-slate-500 mt-1 text-sm">Acesse sua conta para continuar</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suas credenciais</CardTitle>
          <CardDescription>Email e senha cadastrados na plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Senha</FormLabel>
                      <Link href="/esqueci-senha" className="text-xs text-indigo-600 hover:underline">
                        Esqueci minha senha
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </Form>

          {unverifiedEmail && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <p>Confirme seu e-mail para entrar. Verifique sua caixa de entrada.</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-1 font-medium text-amber-900 hover:underline disabled:opacity-60"
              >
                {resending ? 'Reenviando...' : 'Reenviar link de confirmação'}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-sm text-slate-500 space-y-1">
        <p>Ainda não tem conta?</p>
        <div className="flex justify-center gap-4">
          <Link
            href="/cadastro/hospital"
            className="text-indigo-600 font-medium hover:underline"
          >
            Cadastrar hospital
          </Link>
          <span className="text-slate-300">•</span>
          <Link
            href="/cadastro/profissional"
            className="text-indigo-600 font-medium hover:underline"
          >
            Cadastrar profissional
          </Link>
        </div>
      </div>
    </div>
  )
}
