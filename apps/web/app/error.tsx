'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Algo deu errado</h1>
        <p className="text-slate-500 text-sm">
          Tivemos um problema ao carregar esta página. Você pode tentar de novo ou voltar para o início.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={reset}>Tentar novamente</Button>
          <Link href="/">
            <Button>Voltar ao início</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
