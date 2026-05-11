# Documentação da API — PlantõesMed

**Base URL:** `http://localhost:3333/api/v1` (desenvolvimento)  
**Formato:** JSON  
**Autenticação:** Bearer token no header `Authorization` para rotas protegidas  
**Refresh token:** Cookie httpOnly `refreshToken`, definido automaticamente pelo servidor

---

## Convenções

### Autenticação

Rotas marcadas com **Sim** requerem o header:

```
Authorization: Bearer <accessToken>
```

O access token expira em 15 minutos. Use `POST /auth/refresh` para renová-lo sem novo login.

### Formato de erro

Todos os erros seguem a estrutura:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Credenciais inválidas"
  }
}
```

Códigos de erro possíveis: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `TOO_MANY_REQUESTS`, `INTERNAL_SERVER_ERROR`.

### Paginação

Respostas de listagem incluem o objeto `pagination`:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 87,
    "totalPages": 5
  }
}
```

---

## Auth

### POST /auth/login

Autentica um usuário e retorna access token + define cookie de refresh token.

Rate limit: 5 tentativas por IP a cada 15 minutos.

**Auth required:** Não

**Request body:**

```json
{
  "email": "mariana@hospitalsaopaulo.com.br",
  "password": "Senha@2026"
}
```

**Response 200:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1abc123",
    "email": "mariana@hospitalsaopaulo.com.br",
    "role": "HOSPITAL"
  }
}
```

O cookie `refreshToken` (httpOnly, SameSite=Strict) é definido automaticamente na resposta.

**Response 401:** Credenciais inválidas  
**Response 429:** Rate limit excedido

---

### POST /auth/register/hospital

Cadastra um novo hospital e já retorna tokens (login automático pós-cadastro).

Rate limit: 10 tentativas por IP a cada hora.

**Auth required:** Não

**Request body:**

```json
{
  "email": "contato@hospitalsaopaulo.com.br",
  "password": "Senha@2026",
  "name": "Hospital São Paulo",
  "cnpj": "12345678000195",
  "phone": "11987654321",
  "street": "Rua Dr. Ovídio Pires de Campos",
  "number": "225",
  "complement": "Bloco A",
  "neighborhood": "Cerqueira César",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "05403010"
}
```

Regras de validação:
- `cnpj`: 14 dígitos numéricos sem formatação
- `zipCode`: 8 dígitos numéricos sem formatação
- `state`: 2 letras (UF)
- `password`: mínimo 8 caracteres, ao menos uma maiúscula e um número
- `complement`: campo opcional

**Response 201:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1abc123",
    "email": "contato@hospitalsaopaulo.com.br",
    "role": "HOSPITAL"
  }
}
```

**Response 409:** E-mail ou CNPJ já cadastrado  
**Response 422:** Dados de validação inválidos

---

### POST /auth/register/professional

Cadastra um novo profissional de saúde (médico ou enfermeiro).

Rate limit: 10 tentativas por IP a cada hora.

**Auth required:** Não

**Request body:**

```json
{
  "email": "rafael.silva@email.com",
  "password": "Senha@2026",
  "name": "Dr. Rafael Silva",
  "cpf": "12345678901",
  "phone": "11912345678",
  "councilType": "CRM",
  "councilNumber": "123456",
  "councilState": "SP",
  "specialtyIds": [
    "clx2specialty001",
    "clx2specialty002"
  ]
}
```

Regras de validação:
- `cpf`: 11 dígitos numéricos sem formatação
- `councilType`: `"CRM"` ou `"COREN"`
- `councilState`: 2 letras (UF)
- `specialtyIds`: array com ao menos 1 ID — use `GET /specialties` para obter os IDs

**Response 201:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx3abc456",
    "email": "rafael.silva@email.com",
    "role": "PROFESSIONAL"
  }
}
```

**Response 409:** E-mail ou CPF já cadastrado

---

### POST /auth/refresh

Emite um novo access token usando o refresh token armazenado no cookie httpOnly.

**Auth required:** Não (usa cookie `refreshToken` automaticamente)

**Request body:** Nenhum

**Response 200:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 401:** Cookie ausente, refresh token inválido ou expirado

---

### POST /auth/logout

Invalida o refresh token atual. O cookie é removido.

**Auth required:** Não (usa cookie `refreshToken`)

**Request body:** Nenhum

**Response 204:** Sem corpo

---

### GET /auth/me

Retorna os dados do usuário autenticado incluindo o perfil completo (hospital ou profissional).

**Auth required:** Sim (qualquer perfil)

**Response 200 — Hospital:**

```json
{
  "id": "clx1abc123",
  "email": "contato@hospitalsaopaulo.com.br",
  "role": "HOSPITAL",
  "status": "ACTIVE",
  "createdAt": "2026-01-10T14:30:00.000Z",
  "hospitalProfile": {
    "id": "clx1prof001",
    "name": "Hospital São Paulo",
    "cnpj": "12345678000195",
    "phone": "11987654321",
    "street": "Rua Dr. Ovídio Pires de Campos",
    "number": "225",
    "complement": "Bloco A",
    "neighborhood": "Cerqueira César",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "05403010"
  },
  "professionalProfile": null
}
```

**Response 200 — Profissional:**

```json
{
  "id": "clx3abc456",
  "email": "rafael.silva@email.com",
  "role": "PROFESSIONAL",
  "status": "ACTIVE",
  "createdAt": "2026-01-12T09:15:00.000Z",
  "hospitalProfile": null,
  "professionalProfile": {
    "id": "clx3prof002",
    "name": "Dr. Rafael Silva",
    "cpf": "12345678901",
    "phone": "11912345678",
    "councilType": "CRM",
    "councilNumber": "123456",
    "councilState": "SP",
    "specialties": [
      { "specialty": { "id": "clx2specialty001", "name": "Clínica Médica" } },
      { "specialty": { "id": "clx2specialty008", "name": "Emergência" } }
    ]
  }
}
```

---

## Specialties

### GET /specialties

Lista todas as especialidades médicas disponíveis na plataforma. Usado para preencher selects no cadastro de profissionais e na criação de plantões.

**Auth required:** Não

**Response 200:**

```json
[
  { "id": "clx2specialty001", "name": "Clínica Médica" },
  { "id": "clx2specialty002", "name": "Cirurgia Geral" },
  { "id": "clx2specialty003", "name": "Pediatria" },
  { "id": "clx2specialty004", "name": "Ginecologia e Obstetrícia" },
  { "id": "clx2specialty005", "name": "Anestesiologia" },
  { "id": "clx2specialty006", "name": "UTI Adulto" },
  { "id": "clx2specialty007", "name": "UTI Neonatal" },
  { "id": "clx2specialty008", "name": "Emergência" },
  { "id": "clx2specialty009", "name": "Ortopedia" },
  { "id": "clx2specialty010", "name": "Cardiologia" }
]
```

---

## Shifts

### GET /shifts

Lista plantões com filtros opcionais. Profissionais veem plantões abertos; hospitais e admin veem todos.

**Auth required:** Sim (qualquer perfil)

**Query params:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `specialtyId` | string | Filtra por especialidade |
| `city` | string | Filtra pela cidade do hospital |
| `state` | string | Filtra pelo estado (UF) do hospital |
| `dateFrom` | string | Data inicial no formato `YYYY-MM-DD` |
| `dateTo` | string | Data final no formato `YYYY-MM-DD` |
| `status` | string | `OPEN`, `FILLED`, `CANCELLED` ou `COMPLETED` |
| `page` | number | Página (padrão: 1) |
| `limit` | number | Itens por página, máximo 100 (padrão: 20) |

**Response 200:**

```json
{
  "data": [
    {
      "id": "clx4shift001",
      "title": "Plantão UTI Adulto — Noite",
      "description": "Plantão de 12h na UTI adulto. Experiência mínima de 2 anos em terapia intensiva.",
      "date": "2026-05-20",
      "startTime": "19:00",
      "endTime": "07:00",
      "location": "UTI Adulto — Ala Norte",
      "slots": 2,
      "filledSlots": 1,
      "status": "OPEN",
      "createdAt": "2026-05-11T10:00:00.000Z",
      "specialty": { "id": "clx2specialty006", "name": "UTI Adulto" },
      "hospital": {
        "id": "clx1prof001",
        "name": "Hospital São Paulo",
        "city": "São Paulo",
        "state": "SP"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### POST /shifts

Cria um novo plantão. Apenas hospitais.

**Auth required:** Sim — perfil `HOSPITAL`

**Request body:**

```json
{
  "title": "Plantão UTI Adulto — Noite",
  "description": "Plantão de 12h na UTI adulto. Experiência mínima de 2 anos em terapia intensiva.",
  "specialtyId": "clx2specialty006",
  "date": "2026-05-20",
  "startTime": "19:00",
  "endTime": "07:00",
  "location": "UTI Adulto — Ala Norte",
  "slots": 2
}
```

Regras de validação:
- `title`: mínimo 3 caracteres
- `description`: mínimo 10 caracteres
- `date`: formato `YYYY-MM-DD`, não pode ser data passada
- `startTime` / `endTime`: formato `HH:mm`
- `slots`: inteiro entre 1 e 50

**Response 201:**

```json
{
  "id": "clx4shift001",
  "title": "Plantão UTI Adulto — Noite",
  "description": "Plantão de 12h na UTI adulto. Experiência mínima de 2 anos em terapia intensiva.",
  "date": "2026-05-20",
  "startTime": "19:00",
  "endTime": "07:00",
  "location": "UTI Adulto — Ala Norte",
  "slots": 2,
  "filledSlots": 0,
  "status": "OPEN",
  "specialtyId": "clx2specialty006",
  "hospitalId": "clx1prof001",
  "createdAt": "2026-05-11T10:00:00.000Z",
  "updatedAt": "2026-05-11T10:00:00.000Z"
}
```

---

### GET /shifts/:id

Retorna os detalhes completos de um plantão.

**Auth required:** Sim (qualquer perfil)

**Response 200:**

```json
{
  "id": "clx4shift001",
  "title": "Plantão UTI Adulto — Noite",
  "description": "Plantão de 12h na UTI adulto. Experiência mínima de 2 anos em terapia intensiva.",
  "date": "2026-05-20",
  "startTime": "19:00",
  "endTime": "07:00",
  "location": "UTI Adulto — Ala Norte",
  "slots": 2,
  "filledSlots": 1,
  "status": "OPEN",
  "createdAt": "2026-05-11T10:00:00.000Z",
  "updatedAt": "2026-05-11T14:22:00.000Z",
  "specialty": { "id": "clx2specialty006", "name": "UTI Adulto" },
  "hospital": {
    "id": "clx1prof001",
    "name": "Hospital São Paulo",
    "street": "Rua Dr. Ovídio Pires de Campos",
    "number": "225",
    "neighborhood": "Cerqueira César",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "05403010"
  }
}
```

**Response 404:** Plantão não encontrado

---

### PATCH /shifts/:id

Atualiza campos de um plantão existente. Apenas o hospital dono do plantão pode editar.

**Auth required:** Sim — perfil `HOSPITAL`

**Request body** (todos os campos são opcionais):

```json
{
  "title": "Plantão UTI Adulto — Noite (atualizado)",
  "slots": 3,
  "status": "CANCELLED"
}
```

Status válidos para atualização: `OPEN`, `FILLED`, `CANCELLED`, `COMPLETED`.

**Response 200:** Objeto do plantão atualizado

**Response 403:** Tentativa de editar plantão de outro hospital  
**Response 404:** Plantão não encontrado

---

### DELETE /shifts/:id

Cancela um plantão (define status como `CANCELLED`). Operação lógica — o registro é mantido.

**Auth required:** Sim — perfil `HOSPITAL`

**Response 204:** Sem corpo

**Response 403:** Tentativa de cancelar plantão de outro hospital

---

### GET /hospitals/me/shifts

Lista todos os plantões do hospital autenticado.

**Auth required:** Sim — perfil `HOSPITAL`

**Query params:** `status`, `page`, `limit` (mesmos de `GET /shifts`)

**Response 200:** Mesmo formato de `GET /shifts`

---

## Applications

### POST /shifts/:shiftId/applications

Profissional se candidata a um plantão.

**Auth required:** Sim — perfil `PROFESSIONAL`

**Request body:**

```json
{
  "message": "Tenho 5 anos de experiência em UTI adulto e estou disponível para o horário."
}
```

O campo `message` é opcional (máximo 500 caracteres).

**Response 201:**

```json
{
  "id": "clx5app001",
  "shiftId": "clx4shift001",
  "professionalId": "clx3prof002",
  "status": "PENDING",
  "message": "Tenho 5 anos de experiência em UTI adulto e estou disponível para o horário.",
  "createdAt": "2026-05-11T11:05:00.000Z",
  "updatedAt": "2026-05-11T11:05:00.000Z"
}
```

**Response 409:** Profissional já se candidatou a este plantão  
**Response 400:** Plantão sem vagas disponíveis ou não está com status `OPEN`

---

### GET /shifts/:shiftId/applications

Lista todas as candidaturas de um plantão. Usado pelo hospital para revisar candidatos.

**Auth required:** Sim — perfil `HOSPITAL` ou `ADMIN`

**Query params:** `status` (`PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`), `page`, `limit`

**Response 200:**

```json
{
  "data": [
    {
      "id": "clx5app001",
      "status": "PENDING",
      "message": "Tenho 5 anos de experiência em UTI adulto.",
      "createdAt": "2026-05-11T11:05:00.000Z",
      "professional": {
        "id": "clx3prof002",
        "name": "Dr. Rafael Silva",
        "councilType": "CRM",
        "councilNumber": "123456",
        "councilState": "SP",
        "specialties": [
          { "specialty": { "id": "clx2specialty006", "name": "UTI Adulto" } }
        ]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### GET /applications/me

Lista todas as candidaturas do profissional autenticado.

**Auth required:** Sim — perfil `PROFESSIONAL`

**Query params:** `status` (`PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`), `page`, `limit`

**Response 200:**

```json
{
  "data": [
    {
      "id": "clx5app001",
      "status": "PENDING",
      "message": "Tenho 5 anos de experiência em UTI adulto.",
      "createdAt": "2026-05-11T11:05:00.000Z",
      "shift": {
        "id": "clx4shift001",
        "title": "Plantão UTI Adulto — Noite",
        "date": "2026-05-20",
        "startTime": "19:00",
        "endTime": "07:00",
        "status": "OPEN",
        "hospital": { "id": "clx1prof001", "name": "Hospital São Paulo" }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

---

### GET /applications/:id

Retorna os detalhes de uma candidatura específica.

**Auth required:** Sim (hospital dono do plantão, profissional dono da candidatura ou admin)

**Response 200:** Objeto completo da candidatura com dados do plantão e do profissional

**Response 403:** Acesso negado  
**Response 404:** Candidatura não encontrada

---

### PATCH /applications/:id/status

Hospital aceita ou recusa uma candidatura.

**Auth required:** Sim — perfil `HOSPITAL`

**Request body:**

```json
{
  "status": "ACCEPTED"
}
```

Valores válidos: `"ACCEPTED"` ou `"REJECTED"`.

Ao aceitar (`ACCEPTED`), `filledSlots` do plantão é incrementado. Se `filledSlots` atingir `slots`, o status do plantão muda automaticamente para `FILLED`.

**Response 200:**

```json
{
  "id": "clx5app001",
  "status": "ACCEPTED",
  "updatedAt": "2026-05-11T12:30:00.000Z"
}
```

**Response 403:** Tentativa de atualizar candidatura de plantão de outro hospital  
**Response 400:** Candidatura já foi processada (não está mais `PENDING`)

---

### PATCH /applications/:id/withdraw

Profissional retira sua própria candidatura.

**Auth required:** Sim — perfil `PROFESSIONAL`

**Request body:** Nenhum

**Response 200:**

```json
{
  "id": "clx5app001",
  "status": "WITHDRAWN",
  "updatedAt": "2026-05-11T13:00:00.000Z"
}
```

**Response 403:** Tentativa de retirar candidatura de outro profissional  
**Response 400:** Candidatura não está mais `PENDING`

---

## Admin

Todos os endpoints abaixo requerem autenticação com perfil `ADMIN`.

---

### GET /admin/metrics

Retorna métricas gerais da plataforma.

**Auth required:** Sim — perfil `ADMIN`

**Response 200:**

```json
{
  "totalHospitals": 42,
  "totalProfessionals": 318,
  "totalShifts": 215,
  "openShifts": 87,
  "filledShifts": 104,
  "cancelledShifts": 24,
  "totalApplications": 891,
  "fillRate": 48.37
}
```

`fillRate` representa a porcentagem de plantões com status `FILLED` em relação ao total.

---

### GET /admin/users

Lista todos os usuários com filtros opcionais.

**Auth required:** Sim — perfil `ADMIN`

**Query params:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `role` | string | `HOSPITAL`, `PROFESSIONAL` ou `ADMIN` |
| `status` | string | `ACTIVE`, `INACTIVE` ou `PENDING_VERIFICATION` |
| `page` | number | Página (padrão: 1) |
| `limit` | number | Itens por página (padrão: 20) |

**Response 200:**

```json
{
  "data": [
    {
      "id": "clx1abc123",
      "email": "contato@hospitalsaopaulo.com.br",
      "role": "HOSPITAL",
      "status": "ACTIVE",
      "createdAt": "2026-01-10T14:30:00.000Z",
      "updatedAt": "2026-05-11T10:00:00.000Z",
      "hospitalProfile": {
        "id": "clx1prof001",
        "name": "Hospital São Paulo",
        "cnpj": "12345678000195",
        "city": "São Paulo",
        "state": "SP"
      },
      "professionalProfile": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 360,
    "totalPages": 18
  }
}
```

---

### GET /admin/users/:id

Retorna todos os dados de um usuário específico, incluindo o perfil completo.

**Auth required:** Sim — perfil `ADMIN`

**Response 200:** Objeto completo do usuário com `hospitalProfile` ou `professionalProfile`

**Response 404:** Usuário não encontrado

---

### PATCH /admin/users/:id/status

Ativa ou desativa um usuário. Não é possível alterar o status de um admin.

**Auth required:** Sim — perfil `ADMIN`

**Request body:**

```json
{
  "status": "INACTIVE"
}
```

Valores válidos: `"ACTIVE"`, `"INACTIVE"`, `"PENDING_VERIFICATION"`.

**Response 200:**

```json
{
  "id": "clx1abc123",
  "email": "contato@hospitalsaopaulo.com.br",
  "role": "HOSPITAL",
  "status": "INACTIVE",
  "updatedAt": "2026-05-11T15:45:00.000Z"
}
```

**Response 400:** Tentativa de alterar status de um administrador  
**Response 404:** Usuário não encontrado

---

### GET /admin/shifts

Lista todos os plantões da plataforma com visão global.

**Auth required:** Sim — perfil `ADMIN`

**Query params:** `status` (`OPEN`, `FILLED`, `CANCELLED`, `COMPLETED`), `page`, `limit`

**Response 200:**

```json
{
  "data": [
    {
      "id": "clx4shift001",
      "title": "Plantão UTI Adulto — Noite",
      "date": "2026-05-20",
      "startTime": "19:00",
      "endTime": "07:00",
      "slots": 2,
      "filledSlots": 1,
      "status": "OPEN",
      "createdAt": "2026-05-11T10:00:00.000Z",
      "specialty": { "id": "clx2specialty006", "name": "UTI Adulto" },
      "hospital": {
        "id": "clx1prof001",
        "name": "Hospital São Paulo",
        "city": "São Paulo",
        "state": "SP"
      },
      "_count": { "applications": 3 }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 215,
    "totalPages": 11
  }
}
```

---

## Referência de Status

### UserStatus

| Valor | Descrição |
|-------|-----------|
| `ACTIVE` | Usuário com acesso normal à plataforma |
| `INACTIVE` | Desativado pelo admin — login bloqueado |
| `PENDING_VERIFICATION` | Cadastro realizado, verificação pendente |

### ShiftStatus

| Valor | Descrição |
|-------|-----------|
| `OPEN` | Plantão publicado e recebendo candidaturas |
| `FILLED` | Todas as vagas preenchidas |
| `CANCELLED` | Cancelado pelo hospital |
| `COMPLETED` | Plantão realizado |

### ApplicationStatus

| Valor | Descrição |
|-------|-----------|
| `PENDING` | Candidatura enviada, aguardando resposta do hospital |
| `ACCEPTED` | Profissional aceito pelo hospital |
| `REJECTED` | Candidatura recusada pelo hospital |
| `WITHDRAWN` | Retirada pelo próprio profissional |
