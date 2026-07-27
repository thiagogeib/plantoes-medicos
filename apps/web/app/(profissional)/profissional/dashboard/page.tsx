'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle, FileText, CalendarClock, Wallet } from 'lucide-react'
import { useMyApplications } from '@/hooks/use-my-applications'
import { apiClient } from '@/lib/api-client'
import { CandidaturaCard } from '@/components/shared/candidatura/CandidaturaCard'
import { MetricaCard } from '@/components/shared/admin/MetricaCard'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import type { ProfessionalMonthStats } from '@plantoes-medicos/types'

const compensationLabel: Record<string, string> = {
  MONEY: 'Pagos em dinheiro',
  HOUR_BANK: 'Banco de horas',
  OTHER: 'Outra forma',
}

export default function ProfissionalDashboardPage() {
  const router = useRouter()
  const { applications, loading } = useMyApplications({ limit: 5 })
  const [stats, setStats] = useState<ProfessionalMonthStats | null>(null)

  useEffect(() => {
    apiClient
      .get<{ data: ProfessionalMonthStats }>('/applications/me/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
  }, [])

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

      {stats && stats.shiftsCount > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Este mês</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricaCard
              title="Plantões trabalhados"
              value={stats.shiftsCount}
              icon={CalendarClock}
              color="blue"
            />
            <MetricaCard
              title="Horas trabalhadas"
              value={`${stats.totalHours}h`}
              icon={Clock}
              color="emerald"
            />
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-lg p-2.5 bg-amber-50">
                    <Wallet className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
                <div className="space-y-1">
                  {Object.entries(stats.byCompensation)
                    .filter(([, count]) => count > 0)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">{compensationLabel[type]}</span>
                        <span className="font-semibold text-slate-900">{count}</span>
                      </div>
                    ))}
                </div>
                <p className="text-sm text-slate-500 mt-2">Forma de compensação</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
