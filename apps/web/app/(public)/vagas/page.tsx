'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MapPin, Clock, Users, Search, Stethoscope } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Shift, ApiListResponse } from '@plantoes-medicos/types'

interface Specialty { id: string; name: string }

function ShiftCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </CardContent>
    </Card>
  )
}

export default function VagasPublicPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [specialtyId, setSpecialtyId] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [city, setCity] = useState('')

  useEffect(() => {
    apiClient
      .get<{ data: Specialty[] }>('/specialties')
      .then((r) => setSpecialties(r.data))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' })
      if (specialtyId) params.set('specialtyId', specialtyId)
      if (city) params.set('city', city)
      const res = await apiClient.get<ApiListResponse<Shift>>(
        `/public/shifts?${params.toString()}`
      )
      setShifts(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch {
      setShifts([])
    } finally {
      setLoading(false)
    }
  }, [specialtyId, city, page])

  useEffect(() => { void load() }, [load])

  function handleSearch() {
    setCity(cityInput)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg text-slate-900">PlantoesMed</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
            <Link href="/cadastro/profissional">
              <Button size="sm">Cadastrar-se</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-blue-600 text-white py-12 px-4 text-center">
        <h1 className="text-3xl font-bold mb-2">Plantões disponíveis</h1>
        <p className="text-blue-100 text-sm">
          Encontre oportunidades de plantão e candidate-se em minutos
        </p>
      </div>

      {/* Filters */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-slate-500 mb-1 block">Especialidade</label>
            <Select
              value={specialtyId}
              onValueChange={(v) => { setSpecialtyId(v === '__all__' ? '' : v); setPage(1) }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as especialidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as especialidades</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 flex-1 min-w-48">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Cidade</label>
              <Input
                placeholder="Ex: São Paulo"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="pt-5">
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <ShiftCardSkeleton key={i} />)}
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum plantão disponível no momento.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shifts.map((shift) => (
                <Link key={shift.id} href={`/vagas/${shift.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                          {shift.title}
                        </h3>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {shift.specialty?.name}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {format(new Date(shift.date), "dd/MM/yyyy", { locale: ptBR })}
                            {' — '}{shift.startTime} às {shift.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{shift.hospital?.city}/{shift.hospital?.state}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {shift.slots - shift.filledSlots} vaga{shift.slots - shift.filledSlots !== 1 ? 's' : ''} disponível
                          </span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <span className="text-blue-600 text-xs font-medium">Ver detalhes →</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-slate-500">{page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
