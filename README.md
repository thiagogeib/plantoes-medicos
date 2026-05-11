# PlantõesMed

> Plataforma de conexão entre hospitais e profissionais de saúde para gestão de plantões médicos

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

---

## Visão Geral

O PlantõesMed elimina a dependência de planilhas e comunicação informal para gestão de plantões. Hospitais publicam vagas, profissionais se candidatam e o sistema gerencia todo o ciclo — da publicação ao preenchimento.

### Funcionalidades por Perfil

**Hospital**
- Publicar plantões com especialidade, horário, setor e número de vagas
- Receber candidaturas e aceitar ou recusar cada profissional
- Acompanhar status das vagas em tempo real (aberto, preenchido, cancelado)
- Histórico de plantões encerrados

**Profissional (Médico / Enfermeiro)**
- Buscar plantões por especialidade, cidade, estado e período
- Candidatar-se com mensagem opcional
- Acompanhar status de cada candidatura (pendente, aceita, recusada)
- Retirar candidatura enquanto estiver pendente

**Admin**
- Métricas gerais da plataforma (hospitais, profissionais, plantões, taxa de preenchimento)
- Gestão de usuários com ativação e desativação de contas
- Visão global de todos os plantões com filtro por status

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui, Zustand, React Hook Form, Zod, Sonner |
| Backend | Node.js, Express, Prisma ORM, PostgreSQL |
| Autenticação | JWT — access token 15min (header) + refresh token 7d (cookie httpOnly) |
| Hash de senha | Argon2id |
| Validação | Zod (API e frontend) |
| Deploy | Vercel (frontend) + Railway (API + banco) |
| CI/CD | GitHub Actions |

---

## Estrutura do Monorepo

```
plantoes-medicos/
├── apps/
│   ├── web/                  # Next.js 14
│   │   ├── app/              # App Router — rotas por perfil
│   │   │   ├── (auth)/       # Login e cadastros
│   │   │   ├── (hospital)/   # Área do hospital
│   │   │   ├── (profissional)/ # Área do profissional
│   │   │   └── (admin)/      # Painel administrativo
│   │   ├── components/
│   │   │   ├── shared/       # PlantaoCard, CandidaturaCard, MetricaCard, layout
│   │   │   └── ui/           # Componentes shadcn/ui
│   │   ├── hooks/            # React Query hooks por feature
│   │   ├── stores/           # Zustand (auth.store)
│   │   └── middleware.ts     # Proteção de rotas por perfil
│   └── api/                  # Node.js + Express
│       ├── src/
│       │   ├── modules/      # auth, shifts, applications, specialties, admin
│       │   └── shared/       # middleware, errors, helpers
│       └── prisma/
│           ├── schema.prisma
│           └── seed.ts
└── packages/
    └── types/                # Interfaces TypeScript compartilhadas
        └── src/              # user, auth, shift, application, admin, api
```

---

## Pré-requisitos

- Node.js 20 ou superior
- PostgreSQL 16 ou superior rodando localmente
- npm 10 ou superior (gerenciamento de workspaces)

---

## Setup Local

### 1. Clonar o repositório

```bash
git clone https://github.com/apllos/plantoes-medicos.git
cd plantoes-medicos
```

### 2. Instalar dependências

O comando instala dependências de todos os workspaces (api, web e packages/types) de uma vez.

```bash
npm install
```

### 3. Configurar o banco de dados

Crie o banco no PostgreSQL local:

```sql
CREATE DATABASE plantoes_medicos;
```

### 4. Configurar variáveis de ambiente

**API:**

```bash
cp apps/api/.env.example apps/api/.env
```

Edite `apps/api/.env` com seus valores:

```env
DATABASE_URL="postgresql://seu_usuario:sua_senha@localhost:5432/plantoes_medicos"

JWT_ACCESS_SECRET="gere-uma-chave-aleatoria-forte-aqui"
JWT_REFRESH_SECRET="gere-outra-chave-aleatoria-forte-aqui"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

PORT=3333
NODE_ENV="development"

CORS_ORIGIN="http://localhost:3000"
```

**Frontend:**

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

O arquivo gerado já aponta para a API local:

```env
NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1
```

### 5. Rodar as migrations

Cria todas as tabelas no banco a partir do `schema.prisma`:

```bash
npm run db:migrate
```

### 6. Rodar o seed

Popula o banco com as 10 especialidades médicas iniciais e cria o usuário admin padrão:

```bash
npm run db:seed
```

Especialidades criadas: Clínica Médica, Cirurgia Geral, Pediatria, Ginecologia e Obstetrícia, Anestesiologia, UTI Adulto, UTI Neonatal, Emergência, Ortopedia, Cardiologia.

### 7. Iniciar a API

```bash
npm run dev:api
```

A API estará disponível em `http://localhost:3333`.

### 8. Iniciar o frontend

Em outro terminal:

```bash
npm run dev:web
```

O frontend estará disponível em `http://localhost:3000`.

### 9. Acessar a aplicação

Abra `http://localhost:3000` no navegador.

**Admin padrão criado pelo seed:**

| Campo | Valor |
|-------|-------|
| E-mail | `admin@plantoesmedicos.com.br` |
| Senha | `Admin@2026` |

---

## Variáveis de Ambiente

### `apps/api/.env`

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://user:pass@localhost:5432/plantoes_medicos` |
| `JWT_ACCESS_SECRET` | Chave para assinar access tokens (HS256) | string aleatória longa |
| `JWT_REFRESH_SECRET` | Chave para assinar refresh tokens (HS256) | string aleatória longa diferente da anterior |
| `JWT_ACCESS_EXPIRES_IN` | Tempo de expiração do access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Tempo de expiração do refresh token | `7d` |
| `PORT` | Porta da API | `3333` |
| `NODE_ENV` | Ambiente de execução | `development` |
| `CORS_ORIGIN` | Origem permitida pelo CORS | `http://localhost:3000` |

### `apps/web/.env.local`

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | URL base da API | `http://localhost:3333/api/v1` |

---

## Scripts Disponíveis

Todos os scripts são executados a partir da raiz do monorepo.

| Script | O que faz |
|--------|-----------|
| `npm run dev:api` | Inicia a API em modo desenvolvimento com hot reload |
| `npm run dev:web` | Inicia o frontend Next.js em modo desenvolvimento |
| `npm run build` | Build de produção de todos os workspaces |
| `npm run db:migrate` | Aplica as migrations Prisma no banco configurado |
| `npm run db:seed` | Popula especialidades e cria o admin padrão |

---

## Deploy

### Frontend — Vercel

1. Conecte o repositório na Vercel
2. Configure o **Root Directory** como `apps/web`
3. Adicione a variável de ambiente `NEXT_PUBLIC_API_URL` apontando para a URL da API em produção
4. Deploy automático a cada push na branch `main`

### Backend e banco — Railway

1. Crie um projeto no Railway
2. Adicione um serviço **PostgreSQL** — a variável `DATABASE_URL` é provisionada automaticamente
3. Adicione um serviço a partir do repositório, com **Root Directory** `apps/api`
4. Configure todas as variáveis de ambiente listadas acima
5. O Railway executa `npm run build` e inicia com `npm start`

### CI/CD — GitHub Actions

O pipeline em `.github/workflows/` executa a cada pull request:
- Lint e build do frontend
- Lint e build da API
- Verificação de tipos TypeScript

---

## Contribuindo

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para diretrizes de contribuição, padrões de commit e processo de pull request.
