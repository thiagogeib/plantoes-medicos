import { type ReactNode } from 'react'
import Link from 'next/link'
import { Stethoscope } from 'lucide-react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 bg-white">
        <Link href="/" className="flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-slate-900">PlantoesMed</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  )
}
