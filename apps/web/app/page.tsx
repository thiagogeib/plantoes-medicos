import Link from 'next/link'
import {
  Stethoscope,
  Search,
  Building2,
  CheckCircle2,
  ClipboardEdit,
  MousePointerClick,
  Radar,
  SlidersHorizontal,
  MousePointer,
  Repeat,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotebookMockup, PhoneMockup } from '@/components/shared/marketing/DeviceMockups'
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

function StepItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="font-semibold text-slate-900 text-sm">{title}</p>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

export default async function LandingPage() {
  const stats = await fetchStats()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-indigo-600" />
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

      <section className="bg-indigo-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
            A escala do plantão não devia morar num grupo de WhatsApp
          </h1>
          <p className="text-indigo-100 text-base sm:text-lg max-w-2xl mx-auto mb-8 text-balance">
            PlantoesMed é o lugar onde o hospital publica o plantão e o profissional se candidata,
            direto — sem planilha, sem intermediário, sem vaga perdida por falta de aviso.
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

      {/* Capítulo 1 — o hospital publica */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Capítulo 1 — pra quem publica o plantão
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 mb-6 text-balance">
              Sua escala, sob controle — sem esperar resposta no grupo
            </h2>
            <div className="space-y-6">
              <StepItem
                icon={ClipboardEdit}
                title="Publique o plantão em minutos"
                description="Especialidade, horário, local e forma de compensação num formulário simples. Sem planilha compartilhada, sem repetir o mesmo aviso em três grupos."
              />
              <StepItem
                icon={MousePointerClick}
                title="Aceite candidatos com um clique"
                description="Veja conselho, especialidade e histórico de cada profissional antes de confirmar — a decisão é sua, a burocracia não existe."
              />
              <StepItem
                icon={Repeat}
                title="Aprove trocas e folgas sem perder o controle"
                description="Quando alguém pede pra trocar ou tirar folga, você decide — e o painel de status do dia mostra a escala real, sempre atualizada."
              />
            </div>
            <Link href="/cadastro/hospital" className="inline-block mt-8">
              <Button size="lg">Cadastrar meu hospital</Button>
            </Link>
          </div>
          <NotebookMockup
            src="/marketing/hospital-plantoes.png"
            alt="Tela de gestão de plantões do hospital no PlantoesMed"
            className="lg:order-last"
          />
        </div>
      </section>

      {/* Capítulo 2 — o profissional encontra e se candidata */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="flex justify-center">
              <PhoneMockup
                src="/marketing/profissional-plantoes-mobile.png"
                alt="Busca de plantões com filtro de turno e compensação no celular"
                className="w-64 sm:w-72"
              />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Capítulo 2 — pra quem cobre o plantão
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 mb-6 text-balance">
                Encontre, candidate-se e acompanhe — sem sair do celular
              </h2>
              <div className="space-y-6">
                <StepItem
                  icon={SlidersHorizontal}
                  title="Filtre por turno e forma de compensação"
                  description="Manhã, tarde ou noite, pagamento em dinheiro ou banco de horas — até achar exatamente o plantão que serve pra sua rotina."
                />
                <StepItem
                  icon={MousePointer}
                  title="Candidate-se com um toque"
                  description="O hospital já vê seu conselho e sua especialidade — nada de currículo por email nem espera sem resposta."
                />
                <StepItem
                  icon={Radar}
                  title="Peça troca ou folga, com aprovação do hospital"
                  description="Imprevisto aconteceu? Peça pra trocar o plantão ou tirar folga direto pela plataforma — o coordenador aprova, sem grupo de WhatsApp no meio."
                />
              </div>
              <Link href="/cadastro/profissional" className="inline-block mt-8">
                <Button size="lg">Criar minha conta de profissional</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Capítulo 3 — nada se perde */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Capítulo 3 — e depois?
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 mb-4 text-balance">
              Nada se perde. Tudo fica registrado num só lugar.
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              Candidatura aceita, troca aprovada, folga confirmada — cada movimentação vira uma
              notificação e entra na conta do mês. O profissional acompanha quantos plantões
              trabalhou e quantas horas fez; o hospital acompanha o status da escala em tempo real.
              Ninguém precisa perguntar "e aí, ficou combinado mesmo?".
            </p>
            <Link href="/vagas" className="inline-block">
              <Button size="lg" variant="outline">Ver plantões disponíveis agora</Button>
            </Link>
          </div>
          <NotebookMockup
            src="/marketing/profissional-dashboard.png"
            alt="Dashboard do profissional com notificações e resumo do mês no PlantoesMed"
          />
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
