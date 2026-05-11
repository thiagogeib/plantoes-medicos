# Design Spec — Plataforma de Plantões Médicos

**Versão:** 1.0  
**Data:** 2026-05-11  
**Stack:** Next.js 14 + Tailwind CSS + shadcn/ui  
**Perfis:** Hospital, Profissional (médico/enfermeiro), Admin

---

## 1. Personas

### Persona 1 — Coordenadora de RH Hospitalar
**Nome:** Mariana, 38 anos  
**Contexto:** Coordena escala de plantonistas em hospital de médio porte. Acessa o sistema pelo desktop durante o expediente administrativo.  
**Metas:** Preencher vagas rapidamente, ter visibilidade de quem está confirmado, evitar plantões descobertos.  
**Frustrações:** Planilhas descentralizadas, confirmar disponibilidade por WhatsApp, não saber se o médico realmente virá.

### Persona 2 — Médico Plantonista
**Nome:** Rafael, 32 anos  
**Contexto:** Clínico geral com CRM ativo. Busca plantões complementares à sua renda principal. Acessa principalmente pelo celular entre turnos.  
**Metas:** Encontrar plantões compatíveis com sua especialidade e disponibilidade, confirmar candidatura rapidamente.  
**Frustrações:** Ligar para vários hospitais, não saber se foi aceito ou recusado, falta de centralização das oportunidades.

### Persona 3 — Administrador da Plataforma
**Nome:** Carlos, 42 anos  
**Contexto:** Responsável pela operação da plataforma. Monitora saúde do sistema e garante que plantões críticos sejam preenchidos.  
**Metas:** Visão geral do sistema, identificar plantões em risco, gerenciar usuários ativos.  
**Frustrações:** Falta de alertas proativos, dificuldade de identificar gargalos no funil hospital → candidatura → preenchimento.

---

## 2. Jobs to Be Done

| Perfil | Job | Frequência |
|--------|-----|------------|
| Hospital | Publicar um plantão com vagas disponíveis | Diário |
| Hospital | Revisar candidatos e aceitar os adequados | Diário |
| Hospital | Acompanhar status das vagas abertas | Diário |
| Profissional | Encontrar plantões compatíveis com minha especialidade | Diário |
| Profissional | Me candidatar a um plantão disponível | Diário |
| Profissional | Saber se minha candidatura foi aceita ou recusada | Diário |
| Admin | Monitorar saúde geral da plataforma | Diário |
| Admin | Identificar plantões próximos sem candidatos | Diário |
| Admin | Ativar ou desativar usuários problemáticos | Semanal |

---

## 3. Mapa de Telas

```
AUTENTICAÇÃO (compartilhada)
  ├── /login               — Login por perfil (Hospital / Profissional / Admin)
  ├── /cadastro/hospital   — Cadastro do Hospital
  └── /cadastro/profissional — Cadastro do Profissional

HOSPITAL
  ├── /hospital/dashboard  — Visão geral: vagas abertas, preenchidas, encerradas
  ├── /hospital/plantoes   — Lista de plantões publicados
  │   ├── Filtros: status (aberto/preenchido/encerrado)
  │   └── Ação: publicar novo plantão
  ├── /hospital/plantoes/novo       — Formulário de criação de plantão
  ├── /hospital/plantoes/[id]       — Detalhe do plantão
  │   └── /hospital/plantoes/[id]/candidatos — Lista de candidatos com aceitar/recusar
  └── /hospital/historico           — Histórico de plantões encerrados

PROFISSIONAL
  ├── /profissional/dashboard  — Candidaturas pendentes, aceitas, recusadas
  ├── /profissional/buscar     — Busca de plantões com filtros
  ├── /profissional/plantao/[id] — Detalhe do plantão + botão candidatar-se
  └── /profissional/historico  — Histórico de candidaturas

ADMIN
  ├── /admin/dashboard     — Métricas gerais + alertas
  ├── /admin/usuarios      — Lista de usuários (hospitais e profissionais)
  │   └── /admin/usuarios/[id] — Detalhe do usuário com ação ativar/desativar
  └── /admin/plantoes      — Visão global de todos os plantões
```

---

## 4. Fluxos de Usuário

### Fluxo 1 — Hospital: Publicar e Preencher um Plantão

```
[Login] → [Dashboard]
  → [Botão "Publicar Plantão"]
  → [Formulário de criação]
  → [Confirmação: "Plantão publicado com sucesso"]
  → [Detalhe do plantão] → [Ver candidatos]
  → [Aceitar candidato] → [Toast: "Candidato aceito. Vaga preenchida."]
  → [Plantão passa para status "Preenchido"]
```

**Estado de erro no formulário:** Campos obrigatórios não preenchidos → validação inline antes do submit.  
**Estado vazio — candidatos:** "Nenhum profissional se candidatou ainda. O plantão está aberto até [data]."

---

### Fluxo 2 — Profissional: Buscar e Se Candidatar a um Plantão

```
[Login] → [Dashboard]
  → [Botão "Buscar Plantões"]
  → [Tela de busca com filtros: especialidade, cidade, data]
  → [Lista de PlantaoCards]
  → [Clique em plantão] → [Detalhe do plantão]
  → [Botão "Candidatar-se"]
  → [Modal de confirmação: "Confirmar candidatura?"]
  → [Toast: "Candidatura enviada! O hospital entrará em contato."]
  → [Dashboard atualizado: candidatura aparece como "Pendente"]
```

**Estado: já candidatado** — botão "Candidatar-se" substituído por badge "Candidatura enviada".  
**Estado: plantão sem vagas** — botão desabilitado com label "Vagas esgotadas".

---

### Fluxo 3 — Admin: Monitorar e Agir sobre Alertas

```
[Login] → [Dashboard Admin]
  → [Seção Alertas: "3 plantões nas próximas 24h sem candidatos"]
  → [Clique em alerta] → [Detalhe do plantão no contexto admin]
  → [Retorna ao dashboard]
  → [Seção Usuários] → [Gestão de Usuários]
  → [Desativar usuário] → [Modal de confirmação]
  → [Toast: "Usuário desativado com sucesso."]
```

---

## 5. Especificação de Telas

---

### Tela: Login

**URL/Rota:** `/login`  
**Quem acessa:** Todos os perfis (seleção no próprio formulário)  
**Objetivo do usuário:** Acessar sua área específica da plataforma

**Componentes e Layout**

Layout centralizado, single column, max-width 400px, vertical middle.

- Logo da plataforma no topo
- Seletor de perfil: tabs ou radio group — "Hospital", "Profissional", "Admin"
- Campo Email (input text, label "E-mail", placeholder "seu@email.com")
- Campo Senha (input password, label "Senha", placeholder "••••••••")
- Link "Esqueci minha senha" alinhado à direita do campo de senha
- Botão primário "Entrar" (full width)
- Link para cadastro: "Ainda não tem conta? Cadastre-se" (apenas para Hospital e Profissional)

**Estados da Tela**

| Estado | Quando ocorre | O que mostrar |
|--------|--------------|---------------|
| Loading | Após clicar em Entrar | Botão com spinner + label "Entrando…" + campos desabilitados |
| Erro de credenciais | Email ou senha inválidos | Alert inline abaixo do botão: "E-mail ou senha incorretos. Verifique os dados e tente novamente." |
| Conta inativa | Usuário desativado pelo admin | Alert inline: "Sua conta está desativada. Entre em contato com o suporte." |

**Validações e Feedback**

- Email: formato inválido → "Informe um e-mail válido."
- Senha: campo vazio ao submeter → "A senha é obrigatória."
- Validação acontece no blur do campo e no submit.

**Comportamento Mobile**

- Layout ocupa 100% da largura com padding 16px lateral.
- Teclado virtual não cobre o botão de submit (campos posicionados no centro superior).

---

### Tela: Cadastro — Hospital

**URL/Rota:** `/cadastro/hospital`  
**Quem acessa:** Representantes de hospitais não cadastrados  
**Objetivo do usuário:** Criar conta para publicar plantões

**Componentes e Layout**

Formulário em card centralizado, max-width 520px. Progresso visual: 1 etapa única.

- Heading: "Cadastro de Hospital"
- Campo CNPJ (input com máscara 00.000.000/0000-00)
- Campo Nome do Hospital (input text)
- Campo Telefone (input com máscara (00) 00000-0000)
- Grupo Endereço:
  - CEP (input com máscara, busca automática ao sair do campo)
  - Logradouro (preenchido automaticamente, editável)
  - Número
  - Complemento (opcional)
  - Cidade / Estado (preenchidos automaticamente, editável)
- Campo E-mail
- Campo Senha / Confirmar Senha
- Checkbox "Aceito os Termos de Uso e Política de Privacidade" (link nos termos)
- Botão primário "Criar conta"
- Link "Já tenho conta. Fazer login"

**Estados da Tela**

| Estado | Quando ocorre | O que mostrar |
|--------|--------------|---------------|
| Loading busca CEP | Ao sair do campo CEP | Spinner no campo CEP, campos de endereço com skeleton |
| CEP não encontrado | CEP inválido ou não localizado | "CEP não encontrado. Preencha o endereço manualmente." |
| CNPJ já cadastrado | Submit com CNPJ existente | Alert inline: "Este CNPJ já está cadastrado. Faça login ou recupere o acesso." |
| Sucesso | Cadastro concluído | Redirect para /hospital/dashboard com toast "Conta criada com sucesso! Bem-vindo." |

**Validações e Feedback**

- CNPJ: formato e dígitos verificadores → "CNPJ inválido."
- Senha: mínimo 8 caracteres → "A senha deve ter pelo menos 8 caracteres."
- Confirmar senha: deve coincidir → "As senhas não coincidem."
- Checkbox termos: obrigatório → "Você precisa aceitar os termos para continuar."

---

### Tela: Cadastro — Profissional

**URL/Rota:** `/cadastro/profissional`  
**Quem acessa:** Médicos e enfermeiros não cadastrados  
**Objetivo do usuário:** Criar conta para buscar e se candidatar a plantões

**Componentes e Layout**

Formulário em card centralizado, max-width 520px.

- Heading: "Cadastro de Profissional"
- Seletor de Categoria: Radio group "Médico (CRM)" / "Enfermeiro (COREN)"
- Campo CRM ou COREN (label muda conforme seleção, com UF — ex: "CRM/SP")
- Campo Nome Completo
- Campo CPF (input com máscara 000.000.000-00)
- Campo Telefone
- Campo E-mail
- Campo Especialidade(s): MultiSelect — permite selecionar múltiplas especialidades de uma lista predefinida
- Campo Senha / Confirmar Senha
- Checkbox de aceite dos Termos
- Botão primário "Criar conta"

**Estados e Validações**

Mesmos padrões do cadastro de hospital. Adicional:
- CRM/COREN: formato numérico com UF obrigatório → "Informe o registro no formato correto, ex: 123456/SP."

---

### Tela: Dashboard — Hospital

**URL/Rota:** `/hospital/dashboard`  
**Quem acessa:** Usuário Hospital autenticado  
**Objetivo do usuário:** Ter visão rápida do status das vagas e agir sobre pendências

**Componentes e Layout**

Layout com sidebar fixa à esquerda (desktop) e header com logo + avatar do hospital.

**Linha de métricas (topo):**
- 3 MetricaCards em linha:
  - "Plantões Abertos" — número + ícone calendário, cor primária
  - "Plantões Preenchidos" — número + ícone check, cor sucesso
  - "Plantões Encerrados" — número + ícone histórico, cor neutra

**Seção: Plantões com candidatos aguardando revisão**
- Heading "Aguardando sua avaliação" com badge contador
- Lista de até 5 PlantaoCards com botão de ação rápida "Ver candidatos"
- Link "Ver todos" se houver mais de 5

**Seção: Próximos Plantões**
- Lista de PlantaoCards dos plantões com data mais próxima
- Indicador visual de urgência para plantões nas próximas 48h sem candidatos

**Ação Fixa:**
- Botão primário flutuante no mobile "Publicar Plantão"
- Botão primário na sidebar/header no desktop "Publicar Plantão"

**Estados da Tela**

| Estado | Quando ocorre | O que mostrar |
|--------|--------------|---------------|
| Loading | Carregando dados | Skeleton dos 3 MetricaCards + skeleton de 3 PlantaoCards |
| Vazio total | Hospital acabou de se cadastrar | Ilustração + "Nenhum plantão publicado ainda. Publique seu primeiro plantão e encontre profissionais disponíveis." + Botão "Publicar Plantão" |
| Sem pendências | Sem candidatos para revisar | Seção "Aguardando avaliação" oculta ou com mensagem "Nenhuma candidatura para revisar." |

---

### Tela: Publicar Plantão

**URL/Rota:** `/hospital/plantoes/novo`  
**Quem acessa:** Usuário Hospital autenticado  
**Objetivo do usuário:** Criar um novo plantão e torná-lo visível para profissionais

**Componentes e Layout**

Formulário em página full (não modal). Header com breadcrumb "Dashboard > Plantões > Novo plantão".

- Campo Data do Plantão (date picker, bloqueia datas passadas)
- Campos Horário de Início / Horário de Término (time picker)
- Campo Especialidade Requerida (select com lista predefinida, single select)
- Campo Local/Setor (input text — ex: "UTI Adulto", "Pronto-Socorro")
- Campo Endereço (preenchido automaticamente com o endereço do hospital, editável)
- Campo Descrição (textarea, max 500 chars, contador de caracteres visível)
- Campo Número de Vagas (input number, min 1, max 20)
- Botão primário "Publicar Plantão"
- Botão ghost "Cancelar" (redireciona para /hospital/plantoes)

**Estados da Tela**

| Estado | Quando ocorre | O que mostrar |
|--------|--------------|---------------|
| Loading submit | Após clicar em Publicar | Botão com spinner "Publicando…" + campos bloqueados |
| Sucesso | Plantão criado | Redirect para /hospital/plantoes/[id] com toast "Plantão publicado com sucesso!" |
| Erro de servidor | Falha na API | Alert inline abaixo do botão: "Não foi possível publicar o plantão. Tente novamente." |

**Validações**

- Data: obrigatória, não pode ser no passado → "Selecione uma data futura."
- Horário fim: deve ser após horário início → "O horário de término deve ser após o início."
- Especialidade: obrigatória → "Selecione a especialidade requerida."
- Número de vagas: obrigatório, mín 1 → "Informe pelo menos 1 vaga."

---

### Tela: Candidatos do Plantão

**URL/Rota:** `/hospital/plantoes/[id]/candidatos`  
**Quem acessa:** Usuário Hospital autenticado  
**Objetivo do usuário:** Revisar profissionais candidatos e aceitar ou recusar cada um

**Componentes e Layout**

- Header com breadcrumb + resumo do plantão (data, horário, especialidade, X vagas restantes)
- Badge de status do plantão (Aberto / Preenchido / Encerrado)
- Lista de CandidaturaCards (um por candidato)
- Filtro por status: "Todos" / "Pendentes" / "Aceitos" / "Recusados" (tabs)

**Cada CandidaturaCard contém:**
- Nome do profissional + categoria (Médico/Enfermeiro)
- CRM/COREN com UF
- Especialidade(s)
- Data e hora da candidatura
- Botão "Aceitar" (primário/sucesso) e Botão "Recusar" (ghost/destrutivo)
- Estado: se já aceito ou recusado, mostra badge e esconde os botões

**Ao clicar em "Aceitar":**
- Modal de confirmação: "Aceitar [Nome do Profissional] para este plantão? O profissional será notificado."
- Botão "Aceitar candidato" / Botão "Cancelar"
- Após confirmação: card atualiza para status "Aceito", contador de vagas decrementar
- Se vagas chegam a 0: toast "Todas as vagas foram preenchidas. O plantão foi encerrado para novas candidaturas."

**Ao clicar em "Recusar":**
- Modal de confirmação: "Recusar a candidatura de [Nome]? O profissional será notificado."
- Botão "Recusar candidatura" / Botão "Cancelar"

**Estados da Tela**

| Estado | Quando ocorre | O que mostrar |
|--------|--------------|---------------|
| Loading | Carregando lista | Skeleton de 3 CandidaturaCards |
| Vazio | Sem candidatos | "Nenhum profissional se candidatou ainda. O plantão está aberto até [data de encerramento]." |
| Plantão encerrado | Status = encerrado | Banner informativo + botões de ação desabilitados |

---

### Tela: Dashboard — Profissional

**URL/Rota:** `/profissional/dashboard`  
**Quem acessa:** Usuário Profissional autenticado  
**Objetivo do usuário:** Ver status das candidaturas e acessar busca de novos plantões

**Componentes e Layout**

- 3 MetricaCards: "Candidaturas Pendentes", "Aceitas", "Recusadas"
- Seção "Minhas candidaturas recentes": lista de CandidaturaCards (status do ponto de vista do profissional)
- Botão de destaque "Buscar Plantões" — ação principal da tela

**CandidaturaCard (visão do profissional):**
- Nome do hospital + especialidade do plantão
- Data e horário
- Badge de status: Pendente (amarelo), Aceito (verde), Recusado (vermelho)
- Link "Ver plantão" para a tela de detalhe

**Estados da Tela**

| Estado | Quando ocorre | O que mostrar |
|--------|--------------|---------------|
| Loading | Carregando | Skeleton de cards |
| Vazio total | Primeiro acesso | "Você ainda não se candidatou a nenhum plantão. Encontre oportunidades disponíveis." + Botão "Buscar Plantões" |

---

### Tela: Buscar Plantões

**URL/Rota:** `/profissional/buscar`  
**Quem acessa:** Usuário Profissional autenticado  
**Objetivo do usuário:** Encontrar plantões compatíveis com suas especialidades e disponibilidade

**Componentes e Layout**

Layout em duas colunas no desktop (painel de filtros à esquerda 280px, resultados à direita). Mobile: filtros colapsáveis em drawer.

**Painel de Filtros:**
- Especialidade (MultiSelect — mostra apenas especialidades do profissional logado por padrão, expansível)
- Cidade (input text com autocomplete)
- Data (date range picker — "de" / "até")
- Botão "Aplicar filtros" (primário)
- Link "Limpar filtros"

**Área de Resultados:**
- Contador: "X plantões encontrados"
- Ordenação: select "Mais recentes" / "Mais próximos" / "Data do plantão"
- Grade de PlantaoCards (2 colunas desktop, 1 coluna mobile)
- Paginação ou infinite scroll (sugerido: paginação com 12 itens por página)

**Estados da Tela**

| Estado | Quando ocorre | O que mostrar |
|--------|--------------|---------------|
| Loading | Carregando resultados | Skeleton de 6 PlantaoCards |
| Sem resultados | Filtros sem match | Ilustração + "Nenhum plantão encontrado com esses filtros. Tente ampliar os critérios de busca." + Botão "Limpar filtros" |
| Erro | Falha na API | Alert: "Não foi possível carregar os plantões. Tente novamente." + Botão "Tentar novamente" |

---

### Tela: Detalhe do Plantão — Profissional

**URL/Rota:** `/profissional/plantao/[id]`  
**Quem acessa:** Usuário Profissional autenticado  
**Objetivo do usuário:** Ver todos os detalhes de um plantão e decidir se candidata

**Componentes e Layout**

- Breadcrumb: "Buscar Plantões > [Especialidade] — [Data]"
- Card principal com:
  - Nome do hospital + endereço
  - Data, horário início e fim
  - Especialidade requerida
  - Local/Setor dentro do hospital
  - Número de vagas disponíveis
  - Descrição completa
- Sidebar ou seção inferior: status + ação
- Botão primário "Candidatar-se" (ocupa full width no mobile)

**Variações do botão de ação:**

| Estado | Botão |
|--------|-------|
| Disponível | "Candidatar-se" (primário, ativo) |
| Já candidatado | Badge "Candidatura enviada" + label "Aguardando resposta do hospital" |
| Aceito | Badge "Candidatura aceita" (verde) |
| Recusado | Badge "Candidatura não aceita" (vermelho) |
| Vagas esgotadas | Botão desabilitado "Vagas esgotadas" |

**Modal de confirmação ao clicar em "Candidatar-se":**
- Título: "Confirmar candidatura"
- Texto: "Você está se candidatando ao plantão de [Especialidade] no [Hospital] em [Data]. O hospital receberá suas informações e entrará em contato."
- Botão "Confirmar candidatura" / Botão "Cancelar"

---

### Tela: Dashboard — Admin

**URL/Rota:** `/admin/dashboard`  
**Quem acessa:** Usuário Admin autenticado  
**Objetivo do usuário:** Monitorar saúde geral da plataforma e agir sobre alertas críticos

**Componentes e Layout**

Layout com sidebar + área de conteúdo. Header com identificação "Painel Administrativo".

**Linha 1 — Métricas principais (5 MetricaCards):**
- Total de Hospitais cadastrados
- Total de Profissionais cadastrados
- Total de Plantões publicados
- Total de Candidaturas
- Taxa de Preenchimento (% de plantões com pelo menos 1 vaga preenchida)

**Linha 2 — Alertas (seção destacada com borda/background âmbar):**
- Heading "Plantões em Risco" com contador badge
- Lista de PlantaoCards compactos: plantões nas próximas 24h com 0 candidatos
- Se vazio: "Nenhum plantão em risco no momento." com ícone positivo

**Linha 3 — Atividade Recente:**
- Tabela simples: últimas 10 ações do sistema (novo hospital, novo profissional, candidatura aceita, etc.)
- Colunas: Tipo, Descrição, Data/Hora

**Estados da Tela**

| Estado | Quando ocorre | O que mostrar |
|--------|--------------|---------------|
| Loading | Carregando métricas | Skeleton dos 5 MetricaCards + skeleton da tabela |
| Sem alertas | Nenhum plantão em risco | Seção de alertas com fundo verde claro e mensagem positiva |

---

### Tela: Gestão de Usuários — Admin

**URL/Rota:** `/admin/usuarios`  
**Quem acessa:** Usuário Admin autenticado  
**Objetivo do usuário:** Visualizar, buscar e gerenciar status de todos os usuários

**Componentes e Layout**

- Tabs: "Hospitais" / "Profissionais"
- Barra de busca por nome, e-mail ou documento
- Filtro por status: "Todos" / "Ativos" / "Inativos"
- Tabela de usuários:
  - Hospitais: Nome, CNPJ, E-mail, Plantões publicados, Status, Ações
  - Profissionais: Nome, CRM/COREN, Especialidade, Candidaturas, Status, Ações
- Ação por linha: botão "Desativar" (usuário ativo) ou "Ativar" (usuário inativo)

**Modal de confirmação — Desativar usuário:**
- Título: "Desativar [Nome do Usuário]?"
- Texto: "Ao desativar este usuário, ele perderá o acesso à plataforma imediatamente. Os dados e histórico serão mantidos. Essa ação pode ser revertida."
- Botão "Desativar usuário" (destrutivo) / Botão "Cancelar"

**Estados da Tela**

| Estado | Quando ocorre | O que mostrar |
|--------|--------------|---------------|
| Loading | Carregando lista | Skeleton da tabela (8 linhas) |
| Sem resultados busca | Busca sem match | "Nenhum usuário encontrado para "[termo]"." |
| Vazio | Nenhum cadastro | "Nenhum [hospital/profissional] cadastrado ainda." |

---

## 6. Design System

### Paleta de Cores

Inspiração: confiança, saúde, clareza. Tom baseado em azul profissional com verde de ação positiva.

```
Primária:        #1D4ED8  — azul — ações principais, links, foco
                 Hover: #1E40AF
                 Light bg: #EFF6FF

Secundária:      #0891B2  — azul-ciano — acentos, badges informativos
                 Hover: #0E7490
                 Light bg: #ECFEFF

Sucesso:         #16A34A  — verde — confirmações, candidatura aceita, plantão preenchido
                 Light bg: #F0FDF4

Erro:            #DC2626  — vermelho — erros, candidatura recusada, ações destrutivas
                 Light bg: #FEF2F2

Aviso:           #D97706  — âmbar — alertas, plantões em risco, candidaturas pendentes
                 Light bg: #FFFBEB

Neutros:
  gray-50:       #F9FAFB  — background de páginas
  gray-100:      #F3F4F6  — background de cards, hover de linhas
  gray-200:      #E5E7EB  — bordas, divisores
  gray-400:      #9CA3AF  — placeholder, texto desabilitado
  gray-600:      #4B5563  — texto secundário
  gray-900:      #111827  — texto principal

Background:      #F9FAFB (claro)
Surface:         #FFFFFF  — cards, modais, sidebar
```

### Tipografia

Família: **Inter** (Google Fonts — alta legibilidade em interfaces médicas)

```
Heading 1:   32px / weight 700 / line-height 1.2 — títulos de página
Heading 2:   24px / weight 600 / line-height 1.3 — seções principais
Heading 3:   20px / weight 600 / line-height 1.4 — subseções, títulos de card
Body:        16px / weight 400 / line-height 1.6 — texto de conteúdo
Small:       14px / weight 400 / line-height 1.5 — labels, metadados
Caption:     12px / weight 400 / line-height 1.4 — timestamps, notas
Label:       14px / weight 500 / line-height 1.4 — labels de formulário
```

### Espaçamento (escala de 4px via Tailwind)

```
xs:  4px  (gap-1)  — gap entre ícone e label, gap entre badges
sm:  8px  (gap-2)  — padding interno de badges/chips
md:  16px (gap-4)  — padding de cards, gap entre campos de formulário
lg:  24px (gap-6)  — padding de seções internas de cards
xl:  32px (gap-8)  — espaço entre blocos de conteúdo
2xl: 48px (gap-12) — espaço entre seções de página
3xl: 64px (gap-16) — padding lateral de páginas no desktop
```

### Bordas e Sombras

```
Border radius:
  sm:   4px   (rounded-sm)  — inputs, badges, chips
  md:   8px   (rounded-md)  — cards, botões
  lg:   12px  (rounded-xl)  — modais, painéis, drawers
  full: 9999px (rounded-full) — avatares, status pills

Sombras:
  sm:   0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)   — card em repouso
  md:   0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)   — card hover, dropdown
  lg:   0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05) — modais

Border padrão: 1px solid #E5E7EB (gray-200)
```

### Componentes Base (mapeados para shadcn/ui)

```
Botões (shadcn Button):
  Primary   — variant="default"    — bg primária, texto branco
  Secondary — variant="secondary"  — bg gray-100, texto gray-900
  Ghost     — variant="ghost"      — sem bg, texto primário
  Destrutivo— variant="destructive"— bg erro, texto branco
  Outline   — variant="outline"    — borda primária, texto primário
  Loading   — desabilitado + spinner inline no label

  Tamanhos: sm (32px height), md/default (40px), lg (48px)
  Mobile: full-width em ações principais de tela

Inputs (shadcn Input + Label + FormMessage):
  Estados visuais:
    Default:   borda gray-200
    Focus:     borda primária + ring azul 2px
    Error:     borda erro + bg erro-light
    Disabled:  bg gray-50, texto gray-400, cursor not-allowed
    Readonly:  bg gray-50, sem borda de foco
  Label: sempre acima, font-medium 14px
  Mensagem de erro: abaixo do input, texto erro 12px
  Placeholder: gray-400

Select (shadcn Select):
  Mesmo padrão visual dos inputs
  Ícone chevron-down à direita

MultiSelect (sem componente nativo no shadcn — implementar com Combobox + badges):
  Tags selecionadas aparecem como chips removíveis dentro do campo
  Dropdown com checkbox por opção

Badges (shadcn Badge):
  Pendente:    bg âmbar-light, texto âmbar, border âmbar
  Aceito:      bg sucesso-light, texto sucesso, border sucesso
  Recusado:    bg erro-light, texto erro, border erro
  Aberto:      bg primária-light, texto primária, border primária
  Encerrado:   bg gray-100, texto gray-600, border gray-200

Toast (shadcn Sonner ou Toast):
  Posição: canto inferior direito (desktop) / topo centralizado (mobile)
  Duração: 4 segundos
  Tipos: sucesso (verde), erro (vermelho), aviso (âmbar), info (azul)

Modal (shadcn Dialog):
  Overlay escuro com blur
  Card branco, border-radius lg, sombra lg
  Botão fechar (X) no canto superior direito
  Ações sempre no rodapé: [Cancelar] [Ação Principal]
  Cancelar sempre à esquerda

Skeleton (shadcn Skeleton):
  bg gray-200 com animação pulse
  Mimetiza o formato do componente real

Tabs (shadcn Tabs):
  Borda inferior na tab ativa, cor primária
  Fundo transparente
```

---

## 7. Especificação dos Componentes Principais

---

### PlantaoCard

Representa um plantão na listagem (busca, dashboard, admin).

**Estrutura visual:**

```
┌─────────────────────────────────────────────────────┐
│  [Badge Status]                          [Urgência?] │
│                                                      │
│  Especialidade • Local/Setor                         │
│  Hospital Nome                                       │
│                                                      │
│  📅 Seg, 15 Jan 2025   🕐 07:00 – 19:00             │
│  📍 Cidade, UF                                       │
│                                                      │
│  [N vagas disponíveis]              [Ver detalhes →] │
└─────────────────────────────────────────────────────┘
```

**Props e variações:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| status | "aberto" \| "preenchido" \| "encerrado" | Controla o badge de status |
| urgente | boolean | true = borda esquerda âmbar + label "Urgente" |
| vagas | number | Número de vagas disponíveis. 0 = exibe "Vagas esgotadas" em cinza |
| candidatado | boolean | Exibe badge "Sua candidatura" sobreposto (visão do profissional) |
| modo | "profissional" \| "hospital" \| "admin" | Controla quais ações aparecem |

**Comportamentos:**

- Hover: sombra md + cursor pointer + transição 150ms
- Click: navega para o detalhe do plantão (rota específica por perfil)
- Status "encerrado": card com opacidade 70%, badge cinza
- Urgente: borda esquerda 4px solid âmbar + badge "Urgente" âmbar no canto superior direito
- Vagas: quando vagas = 1, exibe "Última vaga!" em destaque âmbar
- Mobile: card full-width, ações empilhadas verticalmente

**Estados:**

| Estado | Visual |
|--------|--------|
| Loading (skeleton) | Retângulo gray-200 animate-pulse, altura ~120px |
| Aberto com vagas | Badge azul "Aberto", borda padrão |
| Preenchido | Badge verde "Preenchido", opacidade normal |
| Encerrado | Badge cinza "Encerrado", opacidade 70% |
| Urgente | Borda âmbar esquerda + badge âmbar |

---

### CandidaturaCard

Representa uma candidatura na lista (hospital revisando candidatos, profissional vendo suas candidaturas).

**Estrutura — Visão Hospital (revisão de candidatos):**

```
┌─────────────────────────────────────────────────────┐
│  [Avatar inicial]  Nome Completo do Profissional     │
│                    Médico • CRM 123456/SP            │
│                    Especialidade: Clínica Geral      │
│                                                      │
│  Candidatou-se em: 14 Jan 2025 às 15:32             │
│                                                      │
│  [Recusar]                              [Aceitar]   │
└─────────────────────────────────────────────────────┘
```

**Estrutura — Visão Profissional (minhas candidaturas):**

```
┌─────────────────────────────────────────────────────┐
│  [Badge Status]                                      │
│  Hospital Nome do Hospital                           │
│  Especialidade • Data • Horário                     │
│                                                      │
│  Candidatura enviada em: 14 Jan 2025 às 10:15       │
│                                           [Ver →]   │
└─────────────────────────────────────────────────────┘
```

**Props e variações:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| modo | "hospital" \| "profissional" | Alterna a estrutura visual |
| status | "pendente" \| "aceito" \| "recusado" | Controla badge e disponibilidade de ações |
| onAceitar | function | Callback — abre modal de confirmação |
| onRecusar | function | Callback — abre modal de confirmação |

**Comportamentos:**

- Status "pendente" (visão hospital): botões Aceitar e Recusar visíveis e ativos
- Status "aceito" (visão hospital): badge "Aceito" verde, botões substituídos por badge
- Status "recusado" (visão hospital): badge "Recusado" vermelho, card com opacidade 60%
- Botão "Aceitar": variant sucesso (bordado verde), não usa o botão destrutivo
- Botão "Recusar": variant ghost com texto erro
- Loading state de ação: ao clicar em aceitar/recusar, o card entra em loading enquanto aguarda resposta da API (spinner, botões desabilitados)

---

### MetricaCard

Componente de KPI usado nos dashboards de Hospital, Profissional e Admin.

**Estrutura visual:**

```
┌──────────────────────────────┐
│  [Ícone 24px]                │
│                              │
│  42                          │
│  Plantões Abertos            │
│                              │
│  ↑ 12% este mês    (opcional)│
└──────────────────────────────┘
```

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| valor | number \| string | Número principal de destaque |
| label | string | Descrição da métrica |
| icone | ReactNode | Ícone Lucide relevante |
| corIcone | "primaria" \| "sucesso" \| "erro" \| "aviso" \| "neutra" | Define cor do ícone e do background do ícone |
| tendencia | { valor: number, positivo: boolean } | Opcional — exibe variação percentual |
| loading | boolean | Exibe skeleton quando true |

**Comportamentos:**

- Background do ícone: versão light da cor do ícone (ex: corIcone "sucesso" = bg sucesso-light, ícone cor sucesso)
- Valor grande: font-size 28px, weight 700, cor gray-900
- Label: font-size 14px, weight 500, cor gray-600
- Tendência positiva: texto verde com seta para cima (↑)
- Tendência negativa: texto vermelho com seta para baixo (↓)
- Hover: sombra md sutil (sinaliza que pode ser clicável em contextos de drill-down)
- Loading: skeleton substitui valor e label com barras gray-200 animadas
- Grid: 3 colunas desktop, 2 colunas tablet, 1 coluna mobile (cada card full-width)

---

## 8. Navegação e Layout Global

### Sidebar (desktop)

Largura fixa 240px, colapsável para 64px (icon-only).

**Itens por perfil:**

**Hospital:**
- Dashboard
- Meus Plantões
- Publicar Plantão (destaque — botão primário ou item com cor de destaque)
- Histórico

**Profissional:**
- Dashboard
- Buscar Plantões (destaque)
- Minhas Candidaturas
- Histórico

**Admin:**
- Dashboard
- Gestão de Usuários
- Plantões (visão global)

**Footer da sidebar:** Avatar + nome do usuário + link de logout.

### Bottom Navigation (mobile)

Máximo 4 itens. Ícone + label curto. Item ativo com cor primária.

**Hospital:** Dashboard · Plantões · Publicar · Histórico  
**Profissional:** Dashboard · Buscar · Candidaturas · Histórico  
**Admin:** Dashboard · Usuários · Plantões

### Header (mobile)

Logo da plataforma + ícone de notificações + avatar do usuário.

---

## 9. Checklist de Design — MVP

**UI:**
- [ ] Hierarquia visual clara em todas as telas
- [ ] Botão primário único por tela
- [ ] Loading states em todas as chamadas assíncronas
- [ ] Estado vazio com CTA em todas as listagens
- [ ] Mensagens de erro específicas e orientadas à ação
- [ ] Feedback de sucesso (toast) após toda ação do usuário
- [ ] Espaçamento em múltiplos de 4px
- [ ] Contraste mínimo 4.5:1 para texto

**UX:**
- [ ] Fluxo hospital: publicar → receber candidatos → aceitar — sem dead ends
- [ ] Fluxo profissional: buscar → candidatar → acompanhar status — sem dead ends
- [ ] Confirmação modal para todas as ações destrutivas ou irreversíveis
- [ ] Breadcrumb em telas profundas
- [ ] Filtros na busca de plantões
- [ ] Mobile: alvos de toque mínimo 44×44px
- [ ] Formulários com validação inline (não apenas no submit)
- [ ] Status do plantão sempre visível no card e no detalhe
