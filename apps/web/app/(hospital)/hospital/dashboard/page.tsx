'use client'

import { useRouter } from 'next/navigation'
import { Calendar, CheckCircle, Archive, Plus } from 'lucide-react'
import { useHospitalDashboard } from '@/hooks/use-hospital-dashboard'
import { MetricaCard } from '@/components/shared/admin/MetricaCard'
import { PlantaoCard } from '@/components/shared/plantao/PlantaoCard'
import { OnboardingChecklist } from '@/components/shared/dashboard/OnboardingChecklist'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function HospitalDashboardPage() {
  const router = useRouter()
  const { metrics, recentShifts, hasPublishedShift, hasStaff, loading } = useHospitalDashboard()

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Visão geral dos seus plantões</p>
        </div>
        <Button onClick={() => router.push('/hospital/plantoes/novo')}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo plantão
        </Button>
      </div>

      {!loading && (
        <OnboardingChecklist
          items={[
            {
              label: 'Publique seu primeiro plantão',
              done: hasPublishedShift,
              href: '/hospital/plantoes/novo',
              cta: 'Publicar',
            },
            {
              label: 'Convide um profissional para sua equipe',
              done: hasStaff,
              href: '/hospital/equipe',
              cta: 'Convidar',
            },
          ]}
        />
      )}

      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {loading ? (
          <>
            <Skeleton className="h-16 sm:h-32" />
            <Skeleton className="h-16 sm:h-32" />
            <Skeleton className="h-16 sm:h-32" />
          </>
        ) : (
          <>
            <MetricaCard
              title="Vagas abertas"
              value={metrics.open}
              icon={Calendar}
              color="blue"
            />
            <MetricaCard
              title="Vagas preenchidas"
              value={metrics.filled}
              icon={CheckCircle}
              color="emerald"
            />
            <MetricaCard
              title="Vagas encerradas"
              value={metrics.completed}
              icon={Archive}
              color="slate"
            />
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Plantões recentes</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/hospital/plantoes')}
          >
            Ver todos
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <PlantaoCard key={i} />)
            : recentShifts.map((shift) => (
                <PlantaoCard
                  key={shift.id}
                  shift={shift}
                  onViewCandidates={() => router.push(`/hospital/plantoes/${shift.id}`)}
                />
              ))}
          {!loading && recentShifts.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-400">
              Nenhum plantão publicado ainda.{' '}
              <button
                onClick={() => router.push('/hospital/plantoes/novo')}
                className="text-indigo-600 hover:underline"
              >
                Publicar primeiro plantão
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
