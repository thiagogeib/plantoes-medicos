'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { apiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Repeat, CalendarOff, FileWarning, Calendar, PlusCircle } from 'lucide-react'
import type { ScheduleStatus } from '@plantoes-medicos/types'

const absenceTypeLabel: Record<string, string> = {
  ATESTADO: 'Atestado',
  LICENCA: 'Licença',
  OUTRO: 'Outro',
}

export default function EscalaDoDiaPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [status, setStatus] = useState<ScheduleStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const res = await apiClient.get<{ data: ScheduleStatus }>(`/schedule-status?date=${d}`)
      setStatus(res.data)
    } catch {
      toast.error('Erro ao carregar status do dia')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(date)
  }, [date, load])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Status do Dia</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Resumo consolidado das movimentações da escala em uma data específica.
          </p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : !status ? null : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" /> Plantões do dia ({status.shifts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {status.shifts.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum plantão programado para esta data.</p>
              ) : (
                <div className="space-y-2">
                  {status.shifts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="font-medium text-slate-800">{s.title}</span>
                        <span className="text-slate-400"> — {s.specialty?.name} — {s.startTime}–{s.endTime}</span>
                      </div>
                      <span className="text-slate-500">{s.filledSlots}/{s.slots} vagas</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className="h-4 w-4 text-slate-400" /> Trocas realizadas ({status.swaps.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {status.swaps.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma troca de plantão aprovada para esta data.</p>
              ) : (
                <div className="space-y-2">
                  {status.swaps.map((s) => (
                    <div key={s.id} className="text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <span className="font-medium text-slate-800">{s.shift.title}</span>
                      <span className="text-slate-500">
                        {' '}— {s.from?.name} repassou para {s.to?.name ?? 'profissional selecionado'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarOff className="h-4 w-4 text-slate-400" /> Folgas ({status.leaves.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {status.leaves.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma folga aprovada para esta data.</p>
              ) : (
                <div className="space-y-2">
                  {status.leaves.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-3 text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="font-medium text-slate-800">{l.professional.name}</span>
                        <span className="text-slate-500"> — {l.shift.title}</span>
                      </div>
                      <Badge variant={l.covered ? 'success' : 'warning'}>
                        {l.covered ? `Coberto por ${l.coveredBy?.name ?? '—'}` : 'Sem cobertura ainda'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-slate-400" /> Afastamentos ({status.absences.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {status.absences.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum afastamento vigente nesta data.</p>
              ) : (
                <div className="space-y-2">
                  {status.absences.map((a) => (
                    <div key={a.id} className="text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <span className="font-medium text-slate-800">{a.professional.name}</span>
                      <span className="text-slate-500"> — {absenceTypeLabel[a.type] ?? a.type}</span>
                      {a.note && <p className="text-slate-400 mt-0.5">{a.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-slate-400" /> Plantões extras — cobertura de ausência ({status.extraShifts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {status.extraShifts.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum plantão extra criado para cobrir ausência nesta data.</p>
              ) : (
                <div className="space-y-2">
                  {status.extraShifts.map((s) => (
                    <div key={s.id} className="text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <span className="font-medium text-slate-800">{s.title}</span>
                      <span className="text-slate-500"> — {s.startTime}–{s.endTime}</span>
                      {s.coveringAbsence && (
                        <p className="text-slate-400 mt-0.5">
                          Cobre {absenceTypeLabel[s.coveringAbsence.type] ?? s.coveringAbsence.type} de{' '}
                          <span className="font-medium">{s.coveringAbsence.professional.name}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
