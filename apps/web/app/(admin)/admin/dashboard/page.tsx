'use client'

import Link from 'next/link'
import {
  Building2,
  Stethoscope,
  Calendar,
  CheckCircle,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatDateOnly } from '@/lib/date-utils'
import { usePlatformMetrics } from '@/hooks/use-platform-metrics'
import { useShiftsAtRisk } from '@/hooks/use-shifts-at-risk'
import { useRecentActivity } from '@/hooks/use-recent-activity'
import { MetricaCard } from '@/components/shared/admin/MetricaCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const activityTypeLabel: Record<string, string> = {
  SHIFT: 'Plantão',
  APPLICATION: 'Candidatura',
  SWAP: 'Troca',
  LEAVE: 'Folga',
}

export default function AdminDashboardPage() {
  const { metrics, loading } = usePlatformMetrics()
  const { shifts: riskShifts, loading: loadingRisk } = useShiftsAtRisk()
  const { events, loading: loadingActivity } = useRecentActivity()

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

      {!loadingRisk && riskShifts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Plantões em risco — próximas 24h, sem candidatos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {riskShifts.map((shift) => (
              <Link
                key={shift.id}
                href={`/admin/plantoes`}
                className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm hover:bg-amber-100/50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{shift.title}</p>
                  <p className="text-slate-500 text-xs">
                    {shift.hospital?.name} — {shift.hospital?.city}/{shift.hospital?.state}
                  </p>
                </div>
                <span className="shrink-0 text-amber-700 text-xs font-medium">
                  {formatDateOnly(shift.date, "dd/MM")} · {shift.startTime}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Atividade recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingActivity ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nenhuma atividade recente.</p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {activityTypeLabel[event.type] ?? event.type}
                    </Badge>
                    <span className="text-sm text-slate-700 truncate">{event.summary}</span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {format(parseISO(event.at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
