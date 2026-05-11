'use client'

import { Clock, CheckCircle, FileText } from 'lucide-react'
import { useMyApplications } from '@/hooks/use-my-applications'
import { CandidaturaCard } from '@/components/shared/candidatura/CandidaturaCard'
import { MetricaCard } from '@/components/shared/admin/MetricaCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function ProfissionalDashboardPage() {
  const router = useRouter()
  const { applications, loading } = useMyApplications({ limit: 5 })

  const pending = applications.filter((a) => a.status === 'PENDING').length
  const confirmed = applications.filter((a) => a.status === 'ACCEPTED').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Suas candidaturas e atividades recentes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <MetricaCard
              title="Candidaturas pendentes"
              value={pending}
              icon={Clock}
              color="amber"
            />
            <MetricaCard
              title="Candidaturas confirmadas"
              value={confirmed}
              icon={CheckCircle}
              color="emerald"
            />
            <MetricaCard
              title="Total de candidaturas"
              value={applications.length}
              icon={FileText}
              color="blue"
            />
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Candidaturas recentes</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/profissional/candidaturas')}
          >
            Ver todas
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Nenhuma candidatura ainda.{' '}
            <button
              onClick={() => router.push('/profissional/plantoes')}
              className="text-blue-600 hover:underline"
            >
              Buscar plantões
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <CandidaturaCard key={app.id} application={app} variant="profissional" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
