import Link from 'next/link'
import {
  Stethoscope,
  Search,
  FileCheck,
  CalendarCheck,
  ClipboardList,
  Users,
  BadgeCheck,
  Building2,
  UserRound,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { PublicStats, ApiResponse } from '@plantoes-medicos/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'

async function fetchStats(): Promise<PublicStats | null> {
  try {
    const res = await fetch(`${API_BASE}/public/stats`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const json = (await res.json()) as ApiResponse<PublicStats>
    return json.data
  } catch {
    return null
  }
}

const numberFormatter = new Intl.NumberFormat('pt-BR')

export default async function LandingPage() {
  const stats = await fetchStats()

  return (
    <div className="min-h-screen bg-slate-50">
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

      <section className="bg-blue-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
            Plantões médicos e de enfermagem, sem intermediários
          </h1>
          <p className="text-blue-100 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Hospitais publicam vagas de plantão em minutos. Profissionais encontram, se candidatam
            e são aceitos direto pela plataforma — sem planilha, sem grupo de WhatsApp perdido.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/vagas">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                <Search className="h-4 w-4 mr-2" /> Buscar plantões disponíveis
              </Button>
            </Link>
            <Link href="/cadastro/hospital">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white/10 hover:text-white"
              >
                <Building2 className="h-4 w-4 mr-2" /> Sou hospital, quero publicar vagas
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {stats && (
        <section className="border-b border-slate-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {numberFormatter.format(stats.hospitals)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Hospitais parceiros</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {numberFormatter.format(stats.professionals)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Profissionais cadastrados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {numberFormatter.format(stats.shiftsFilled)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Plantões preenchidos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {numberFormatter.format(stats.openShifts)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Vagas abertas agora</div>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Para profissionais</h2>
              </div>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <Search className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Encontre plantões por especialidade e cidade</p>
                    <p className="text-xs text-slate-500 mt-0.5">Filtre por turno e forma de compensação até achar o que serve pra você.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <FileCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Candidate-se em minutos</p>
                    <p className="text-xs text-slate-500 mt-0.5">Sem enviar currículo por email — o hospital vê seu perfil e conselho direto na plataforma.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <CalendarCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Gerencie sua agenda</p>
                    <p className="text-xs text-slate-500 mt-0.5">Peça troca, solicite folga ou acompanhe suas horas trabalhadas no mês, tudo num só lugar.</p>
                  </div>
                </li>
              </ol>
              <Link href="/cadastro/profissional">
                <Button className="w-full">Criar minha conta de profissional</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">Para hospitais</h2>
              </div>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <ClipboardList className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Publique vagas de plantão</p>
                    <p className="text-xs text-slate-500 mt-0.5">Defina especialidade, horário, local e forma de compensação em um formulário simples.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Users className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Aceite candidatos com um clique</p>
                    <p className="text-xs text-slate-500 mt-0.5">Veja conselho, especialidade e histórico antes de confirmar.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BadgeCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Gerencie sua equipe fixa</p>
                    <p className="text-xs text-slate-500 mt-0.5">Aprove trocas e folgas, acompanhe o status do plantão do dia em tempo real.</p>
                  </div>
                </li>
              </ol>
              <Link href="/cadastro/hospital">
                <Button className="w-full" variant="outline">Cadastrar meu hospital</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Por que PlantoesMed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600">Sem taxa de agenciamento ou intermediário entre hospital e profissional.</p>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600">Gestão de troca e folga com aprovação do hospital, sem depender de grupo de WhatsApp.</p>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600">Painel de status do plantão do dia, visível para toda a equipe.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-4 py-10 text-center text-xs text-slate-400">
        PlantoesMed — plataforma de plantões médicos e de enfermagem.
      </footer>
    </div>
  )
}
