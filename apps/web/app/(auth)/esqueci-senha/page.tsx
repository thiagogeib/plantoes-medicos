'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
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

const schema = z.object({
  email: z.string().email('Email inválido'),
})
type FormValues = z.infer<typeof schema>

export default function EsqueciSenhaPage() {
  const [sent, setSent] = useState(false)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } })

  const onSubmit = async (values: FormValues) => {
    try {
      await apiClient.post('/auth/forgot-password', values)
    } catch {
      // não revela se o email existe — segue para a mesma mensagem
    } finally {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <MailCheck className="h-10 w-10 text-blue-600 mx-auto" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Verifique seu email</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Se este email estiver cadastrado, você vai receber um link para redefinir sua senha em instantes.
          </p>
        </div>
        <Link href="/login" className="text-blue-600 font-medium hover:underline text-sm">
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Esqueceu sua senha?</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Informe seu email e enviaremos um link para redefinir sua senha
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Redefinir senha</CardTitle>
          <CardDescription>Você vai receber um link válido por 1 hora</CardDescription>
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enviando...' : 'Enviar link de redefinição'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="text-center text-sm">
        <Link href="/login" className="text-blue-600 font-medium hover:underline">
          Voltar para o login
        </Link>
      </div>
    </div>
  )
}
