'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, MapPin, Clock, Users, Building2, Stethoscope } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Shift, ApiResponse } from '@plantoes-medicos/types'
import { compensationLabels } from '@/lib/compensation'

export default function VagaPublicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const [shift, setShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get<ApiResponse<Shift>>(`/public/shifts/${id}`)
      .then((r) => setShift(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  function handleCandidatar() {
    if (!user) {
      router.push(`/cadastro/profissional?redirect=/vagas/${id}`)
      return
    }
    if (user.role === 'PROFESSIONAL') {
      router.push(`/profissional/plantoes/${id}`)
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
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

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar às vagas
        </button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !shift ? (
          <div className="text-center py-20 text-slate-400">
            Plantão não encontrado.
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <Badge variant="secondary" className="mb-2">{shift.specialty?.name}</Badge>
                  <CardTitle className="text-xl">{shift.title}</CardTitle>
                </div>
                <Badge
                  variant={shift.slots - shift.filledSlots > 0 ? 'success' : 'secondary'}
                  className="shrink-0"
                >
                  {shift.slots - shift.filledSlots > 0
                    ? `${shift.slots - shift.filledSlots} vaga(s) disponível`
                    : 'Sem vagas'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-slate-600 text-sm">{shift.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {format(new Date(shift.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {' — '}{shift.startTime} às {shift.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{shift.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{shift.filledSlots}/{shift.slots} vagas preenchidas</span>
                </div>
                {shift.hospital && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>{shift.hospital.name} — {shift.hospital.city}/{shift.hospital.state}</span>
                  </div>
                )}
              </div>

              <div>
                <Badge variant="outline">{compensationLabels[shift.compensationType]}</Badge>
                {shift.compensationType === 'OTHER' && shift.compensationNote && (
                  <p className="text-sm text-slate-500 mt-1.5">{shift.compensationNote}</p>
                )}
              </div>

              {shift.slots - shift.filledSlots > 0 && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-3">
                  <p className="text-sm text-blue-800 font-medium">
                    Interessado neste plantão?
                  </p>
                  <p className="text-xs text-blue-700">
                    {user
                      ? 'Clique abaixo para se candidatar.'
                      : 'Crie sua conta gratuitamente e candidate-se em menos de 2 minutos.'}
                  </p>
                  <Button onClick={handleCandidatar} className="w-full sm:w-auto">
                    {user ? 'Candidatar-se' : 'Criar conta e candidatar-se'}
                  </Button>
                  {!user && (
                    <p className="text-xs text-blue-600">
                      Já tem conta?{' '}
                      <Link href="/login" className="underline font-medium">Faça login</Link>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
