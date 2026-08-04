'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import type { ApiError } from '@plantoes-medicos/types'

type Status = 'loading' | 'success' | 'error'

function VerificarEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Este link de confirmação está incompleto.')
      return
    }
    apiClient
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch((err) => {
        const error = err as ApiError
        setStatus('error')
        setMessage(error?.error?.message ?? 'Link inválido ou expirado.')
      })
  }, [token])

  if (status === 'loading') {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <Loader2 className="h-10 w-10 text-indigo-600 mx-auto animate-spin" />
        <h1 className="text-xl font-bold text-slate-900">Confirmando seu e-mail...</h1>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">E-mail confirmado!</h1>
        <p className="text-slate-500 text-sm">Sua conta está ativa. Você já pode entrar.</p>
        <Link href="/login" className="inline-block text-indigo-600 font-medium hover:underline text-sm">
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-4 text-center">
      <XCircle className="h-10 w-10 text-red-500 mx-auto" />
      <h1 className="text-xl font-bold text-slate-900">Não foi possível confirmar</h1>
      <p className="text-slate-500 text-sm">{message}</p>
      <Link href="/login" className="inline-block text-indigo-600 font-medium hover:underline text-sm">
        Voltar para o login
      </Link>
    </div>
  )
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerificarEmailContent />
    </Suspense>
  )
}
