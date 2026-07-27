import Link from 'next/link'
import { Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md space-y-4">
        <Stethoscope className="h-10 w-10 text-blue-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Página não encontrada</h1>
        <p className="text-slate-500 text-sm">
          O endereço que você tentou acessar não existe ou foi movido.
        </p>
        <Link href="/">
          <Button>Voltar ao início</Button>
        </Link>
      </div>
    </div>
  )
}
