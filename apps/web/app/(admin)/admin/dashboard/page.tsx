'use client'

import {
  Building2,
  Stethoscope,
  Calendar,
  CheckCircle,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { usePlatformMetrics } from '@/hooks/use-platform-metrics'
import { MetricaCard } from '@/components/shared/admin/MetricaCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminDashboardPage() {
  const { metrics, loading } = usePlatformMetrics()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Administrativo</h1>
        <p className="text-slate-500 text-sm mt-0.5">Métricas gerais da plataforma</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : metrics ? (
          <>
            <MetricaCard
              title="Hospitais"
              value={metrics.totalHospitals}
              icon={Building2}
              color="blue"
            />
            <MetricaCard
              title="Profissionais"
              value={metrics.totalProfessionals}
              icon={Stethoscope}
              color="emerald"
            />
            <MetricaCard
              title="Plantões totais"
              value={metrics.totalShifts}
              icon={Calendar}
              color="slate"
            />
            <MetricaCard
              title="Vagas abertas"
              value={metrics.openShifts}
              icon={TrendingUp}
              color="amber"
            />
            <MetricaCard
              title="Vagas preenchidas"
              value={metrics.filledShifts}
              icon={CheckCircle}
              color="emerald"
            />
            <MetricaCard
              title="Candidaturas"
              value={metrics.totalApplications}
              icon={Users}
              color="blue"
            />
          </>
        ) : null}
      </div>

      {!loading && metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Taxa de preenchimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold text-indigo-600">
                {metrics.fillRate.toFixed(1)}
              </span>
              <span className="text-2xl text-slate-400 mb-1">%</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              dos plantões publicados foram preenchidos
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && metrics && metrics.openShifts > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700">
              Existem <strong>{metrics.openShifts}</strong> plantões abertos aguardando candidatos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
