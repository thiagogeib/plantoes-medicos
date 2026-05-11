# Guia de Setup Local — PlantõesMed

Este guia leva um ambiente do zero até a aplicação rodando completamente em modo desenvolvimento. Siga os passos em ordem.

---

## Pré-requisitos

Antes de começar, verifique se você tem instalado:

| Ferramenta | Versão mínima | Verificar |
|------------|---------------|-----------|
| Node.js | 20 | `node --version` |
| npm | 10 | `npm --version` |
| PostgreSQL | 16 | `psql --version` |
| Git | qualquer | `git --version` |

O PostgreSQL deve estar rodando localmente e acessível com um usuário que tenha permissão para criar bancos de dados.

---

## Passo 1 — Clonar o repositório

```bash
git clone https://github.com/apllos/plantoes-medicos.git
cd plantoes-medicos
```

A estrutura que você terá:

```
plantoes-medicos/
├── apps/
│   ├── api/        # Node.js + Express + Prisma
│   └── web/        # Next.js 14
└── packages/
    └── types/      # Interfaces TypeScript compartilhadas
```

---

## Passo 2 — Instalar dependências

O projeto usa npm workspaces. Um único comando instala as dependências de todos os pacotes (api, web e types):

```bash
npm install
```

Aguarde a instalação completa. O `node_modules` será criado na raiz e também em cada workspace.

---

## Passo 3 — Criar o banco de dados PostgreSQL

Conecte ao PostgreSQL com seu usuário e crie o banco:

```bash
psql -U postgres
```

```sql
CREATE DATABASE plantoes_medicos;
\q
```

Se preferir fazer pelo terminal sem entrar no psql:

```bash
createdb -U postgres plantoes_medicos
```

---

## Passo 4 — Configurar variáveis de ambiente

### API

```bash
cp apps/api/.env.example apps/api/.env
```

Abra `apps/api/.env` e preencha com seus valores:

```env
# Substitua user, password e a porta se necessário
DATABASE_URL="postgresql://postgres:sua_senha@localhost:5432/plantoes_medicos"

# Gere valores aleatórios e únicos para cada secret
# Exemplo de geração no terminal: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET="cole-aqui-uma-string-longa-e-aleatoria"
JWT_REFRESH_SECRET="cole-aqui-outra-string-diferente-da-anterior"

JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

PORT=3333
NODE_ENV="development"

# URL do frontend para liberar o CORS
CORS_ORIGIN="http://localhost:3000"
```

**Importante:** nunca use os valores de exemplo em produção. Os secrets JWT devem ser strings aleatórias com pelo menos 64 caracteres.

### Frontend

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

O arquivo gerado já tem o valor correto para desenvolvimento local:

```env
NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1
```

Nenhuma alteração é necessária para rodar localmente.

---

## Passo 5 — Executar as migrations

As migrations criam todas as tabelas e índices do banco a partir do `schema.prisma`:

```bash
npm run db:migrate
```

Este comando executa `prisma migrate dev` no workspace da API. Ao final, você verá a confirmação de que as migrations foram aplicadas.

Se quiser verificar as tabelas criadas:

```bash
psql -U postgres -d plantoes_medicos -c "\dt"
```

Tabelas esperadas: `User`, `HospitalProfile`, `ProfessionalProfile`, `Specialty`, `ProfessionalSpecialty`, `Shift`, `Application`, `RefreshToken`.

---

## Passo 6 — Executar o seed

O seed popula o banco com dados iniciais necessários para a operação da plataforma:

```bash
npm run db:seed
```

O que é criado:

**Especialidades (10):**
- Clínica Médica
- Cirurgia Geral
- Pediatria
- Ginecologia e Obstetrícia
- Anestesiologia
- UTI Adulto
- UTI Neonatal
- Emergência
- Ortopedia
- Cardiologia

**Usuário admin padrão:**

| Campo | Valor |
|-------|-------|
| E-mail | `admin@plantoesmedicos.com.br` |
| Senha | `Admin@2026` |
| Perfil | Admin |

O seed usa `upsert` — é seguro executar mais de uma vez sem duplicar dados.

---

## Passo 7 — Iniciar a API

```bash
npm run dev:api
```

A API inicia com hot reload (nodemon/ts-node). Você verá no terminal:

```
Server running on port 3333
```

Para confirmar que está funcionando:

```bash
curl http://localhost:3333/api/v1/specialties
```

Deve retornar o array com as 10 especialidades criadas pelo seed.

---

## Passo 8 — Iniciar o frontend

Abra um novo terminal (mantenha a API rodando no anterior):

```bash
npm run dev:web
```

O Next.js inicia em modo desenvolvimento. Você verá:

```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

---

## Passo 9 — Acessar a aplicação

Abra `http://localhost:3000` no navegador.

Você será redirecionado para `/login`. A partir daí:

### Acessar como Admin

Use as credenciais criadas pelo seed:

- **E-mail:** `admin@plantoesmedicos.com.br`
- **Senha:** `Admin@2026`

### Criar um Hospital de teste

1. Clique em "Cadastre-se" na tela de login
2. Selecione "Hospital"
3. Preencha o formulário (use um CNPJ qualquer de 14 dígitos para teste, ex: `12345678000195`)

### Criar um Profissional de teste

1. Clique em "Cadastre-se"
2. Selecione "Profissional"
3. Selecione a categoria (CRM ou COREN)
4. Escolha ao menos uma especialidade da lista

---

## Solução de Problemas

### Erro: `P1001 — Can't reach database server`

O PostgreSQL não está rodando ou as credenciais em `DATABASE_URL` estão incorretas.

```bash
# Verificar se o PostgreSQL está ativo
pg_ctl status

# No Linux/macOS com systemd
sudo systemctl status postgresql
```

Confirme que o usuário, senha, host e porta no `DATABASE_URL` correspondem à sua instalação.

---

### Erro: `P3006 — Migration failed to apply`

Pode ocorrer se o banco já tiver tabelas incompatíveis. Para um ambiente limpo:

```bash
# Apaga e recria o banco (apenas em desenvolvimento)
dropdb -U postgres plantoes_medicos
createdb -U postgres plantoes_medicos
npm run db:migrate
npm run db:seed
```

---

### Erro de CORS no frontend

Se o browser bloquear requisições com erro de CORS, confirme que:

1. `CORS_ORIGIN` em `apps/api/.env` está exatamente como `http://localhost:3000`
2. A API está rodando na porta `3333`
3. O frontend está rodando na porta `3000`

---

### Porta 3333 ou 3000 já em uso

```bash
# Descobrir qual processo está usando a porta (Windows)
netstat -ano | findstr :3333

# Descobrir qual processo está usando a porta (Linux/macOS)
lsof -i :3333
```

Para usar uma porta diferente na API, altere `PORT` no `apps/api/.env` e atualize `NEXT_PUBLIC_API_URL` no `apps/web/.env.local` correspondentemente.

---

### Seed falha com erro de `argon2`

O pacote `argon2` requer compilação nativa. Se a instalação falhar:

```bash
# Instalar dependências de build (Linux/macOS)
sudo apt-get install build-essential  # Ubuntu/Debian
brew install gcc                       # macOS

# Reinstalar dependências
npm install
```

No Windows, instale as [Build Tools do Visual Studio](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022).

---

## Resumo dos Comandos

```bash
# Clone e dependências
git clone https://github.com/apllos/plantoes-medicos.git
cd plantoes-medicos
npm install

# Banco de dados
createdb -U postgres plantoes_medicos
cp apps/api/.env.example apps/api/.env
# edite apps/api/.env com suas credenciais
cp apps/web/.env.local.example apps/web/.env.local

# Migrations e seed
npm run db:migrate
npm run db:seed

# Iniciar (dois terminais)
npm run dev:api   # terminal 1 → http://localhost:3333
npm run dev:web   # terminal 2 → http://localhost:3000
```
