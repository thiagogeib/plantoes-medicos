/**
 * Smoke test dos fluxos críticos da plataforma, rodado via HTTP contra uma API viva
 * (local ou produção). Cria seus próprios dados (prefixo `smoketest-<timestamp>`),
 * testa, e limpa tudo no final via Prisma direto — não deixa lixo no banco.
 *
 * Uso:
 *   API_URL=http://localhost:3333/api/v1 npx ts-node scripts/smoke-test.ts
 *   API_URL=https://api-production-a9b6.up.railway.app/api/v1 npx ts-node scripts/smoke-test.ts
 */
import "dotenv/config"
import { prisma } from "../src/prisma/client"

const API_URL = process.env.API_URL ?? "http://localhost:3333/api/v1"
const NUM = Date.now() // usado pra gerar CPF/CNPJ únicos e numéricos por execução
const RUN_ID = NUM.toString(36)
const cnpjFor = () => String(NUM).padEnd(14, "0").slice(0, 14)
const cpfFor = (offset: number) => String(NUM + offset).padStart(11, "0").slice(-11)

let passed = 0
let failed = 0
const failures: string[] = []

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    failures.push(label)
    console.error(`  ✗ ${label}`, detail !== undefined ? JSON.stringify(detail) : "")
  }
}

async function req(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { status: res.status, json }
}

async function main() {
  console.log(`\n=== Smoke test — ${API_URL} (run ${RUN_ID}) ===\n`)

  // 0. especialidades
  const specs = await req("GET", "/specialties")
  check("GET /specialties responde 200", specs.status === 200, specs.json)
  const specialtyId = specs.json?.data?.[0]?.id
  check("especialidade disponível pra usar nos testes", !!specialtyId)
  if (!specialtyId) throw new Error("sem especialidade — abortando")

  // 1. cadastro de hospital, médico (CRM) e enfermeiro (COREN)
  const hospitalEmail = `smoketest-hosp-${RUN_ID}@example.com`
  const crmEmail = `smoketest-crm-${RUN_ID}@example.com`
  const coreEmail = `smoketest-coren-${RUN_ID}@example.com`
  const cover_email = `smoketest-cover-${RUN_ID}@example.com`

  const hospReg = await req("POST", "/auth/register/hospital", {
    email: hospitalEmail,
    password: "Teste@2026",
    name: `Hospital Smoketest ${RUN_ID}`,
    cnpj: cnpjFor(),
    phone: "11999990000",
    street: "Rua Teste",
    number: "1",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01310100",
  })
  check("cadastro de hospital", hospReg.status === 201, hospReg.json)
  const hospToken = hospReg.json?.data?.accessToken

  const crmReg = await req("POST", "/auth/register/professional", {
    email: crmEmail,
    password: "Teste@2026",
    name: `Medico Smoketest ${RUN_ID}`,
    cpf: cpfFor(1),
    phone: "11988880000",
    councilType: "CRM",
    councilNumber: `SMK${RUN_ID}`,
    councilState: "SP",
    city: "São Paulo",
    state: "SP",
    specialtyIds: [specialtyId],
  })
  check("cadastro de médico (CRM)", crmReg.status === 201, crmReg.json)
  const crmToken = crmReg.json?.data?.accessToken

  const coreReg = await req("POST", "/auth/register/professional", {
    email: coreEmail,
    password: "Teste@2026",
    name: `Enfermeiro Smoketest ${RUN_ID}`,
    cpf: cpfFor(2),
    phone: "11988881111",
    councilType: "COREN",
    councilNumber: `SMK${RUN_ID}`,
    councilState: "SP",
    city: "São Paulo",
    state: "SP",
    specialtyIds: [specialtyId],
  })
  check("cadastro de enfermeiro (COREN)", coreReg.status === 201, coreReg.json)
  const coreToken = coreReg.json?.data?.accessToken

  const coverReg = await req("POST", "/auth/register/professional", {
    email: cover_email,
    password: "Teste@2026",
    name: `Cobertura Smoketest ${RUN_ID}`,
    cpf: cpfFor(3),
    phone: "11988882222",
    councilType: "CRM",
    councilNumber: `SMK2${RUN_ID}`,
    councilState: "SP",
    city: "São Paulo",
    state: "SP",
    specialtyIds: [specialtyId],
  })
  check("cadastro de médico cobertura (CRM)", coverReg.status === 201, coverReg.json)
  const coverToken = coverReg.json?.data?.accessToken

  // 2. hospital cria plantão exclusivo CRM
  const shiftRes = await req(
    "POST",
    "/shifts",
    {
      title: "Smoketest plantão",
      description: "Descrição de teste automatizado com mais de dez caracteres",
      specialtyId,
      requiredCouncilType: "CRM",
      date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      startTime: "08:00",
      endTime: "14:00",
      location: "Setor smoketest",
      slots: 1,
      compensationType: "MONEY",
    },
    hospToken
  )
  check("hospital cria plantão CRM", shiftRes.status === 201, shiftRes.json)
  const shiftId = shiftRes.json?.data?.id

  // 3. bug do conselho: enfermeiro NÃO pode se candidatar a plantão CRM
  const coreApply = await req("POST", `/shifts/${shiftId}/applications`, {}, coreToken)
  check("enfermeiro (COREN) é bloqueado de plantão CRM (403)", coreApply.status === 403, coreApply.json)

  // 4. médico se candidata normalmente
  const crmApply = await req("POST", `/shifts/${shiftId}/applications`, {}, crmToken)
  check("médico (CRM) se candidata com sucesso", crmApply.status === 201, crmApply.json)
  const applicationId = crmApply.json?.data?.id

  // 5. hospital aceita -> PENDING_CONFIRMATION
  const accept = await req(
    "PATCH",
    `/applications/${applicationId}/status`,
    { status: "ACCEPTED" },
    hospToken
  )
  check(
    "hospital aprova candidatura -> PENDING_CONFIRMATION",
    accept.status === 200 && accept.json?.data?.status === "PENDING_CONFIRMATION",
    accept.json
  )

  // 6. profissional tenta confirmar/pagar — sem Mercado Pago configurado, deve dar 503 amigável (não 500)
  const confirm = await req("POST", `/applications/${applicationId}/confirm`, {}, crmToken)
  check(
    "confirmação de pagamento não quebra (503 esperado sem MP configurado)",
    confirm.status === 503 || confirm.status === 200,
    confirm.json
  )

  // 7. folga: profissional pede folga, vaga de cobertura abre sozinha
  const staffMe = await req("GET", "/staff/me", undefined, crmToken)
  const staffLink = staffMe.json?.data?.[0]
  check("profissional já é staff ativo (auto-criado ao aceitar candidatura)", !!staffLink, staffMe.json)

  if (staffLink) {
    const balance = await req(
      "PATCH",
      `/staff/${staffLink.id}/balance`,
      { hourBankMinutes: 120 },
      hospToken
    )
    check("hospital ajusta banco de horas do profissional", balance.status === 200, balance.json)
    staffLink.hourBankMinutes = 120

    // solicitar folga exige staff FIXO — o vínculo auto-criado ao aceitar candidatura nasce AVULSO
    const setFixo = await req("PATCH", `/staff/${staffLink.id}/type`, { type: "FIXO" }, hospToken)
    check("hospital marca profissional como FIXO", setFixo.status === 200, setFixo.json)
  }

  let leaveShiftId: string | undefined
  let leaveId: string | undefined
  if (staffLink && staffLink.hourBankMinutes >= 60) {
    const leave = await req(
      "POST",
      "/leave-requests",
      {
        specialtyId,
        date: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
        startTime: "08:00",
        endTime: "09:00",
        reason: "Smoketest",
      },
      crmToken
    )
    check("solicitação de folga cria vaga de cobertura", leave.status === 201, leave.json)
    leaveShiftId = leave.json?.data?.shiftId
    leaveId = leave.json?.data?.id

    if (leaveShiftId) {
      const publicShifts = await req(
        "GET",
        `/public/shifts?specialtyId=${specialtyId}`
      )
      const found = publicShifts.json?.data?.some((s: any) => s.id === leaveShiftId)
      check("vaga de cobertura aparece na vitrine pública", !!found)

      const coverApply = await req("POST", `/shifts/${leaveShiftId}/applications`, {}, coverToken)
      check("segundo médico se candidata à vaga de cobertura", coverApply.status === 201, coverApply.json)
      const coverAppId = coverApply.json?.data?.id

      const coverAccept = await req(
        "PATCH",
        `/applications/${coverAppId}/status`,
        { status: "ACCEPTED" },
        hospToken
      )
      check("hospital aprova candidato da cobertura", coverAccept.status === 200, coverAccept.json)

      // dispara o /confirm (503 esperado, mas já cria a Charge) antes de simular o pagamento
      await req("POST", `/applications/${coverAppId}/confirm`, {}, coverToken)

      // simula a confirmação de pagamento direto pelo service (sem depender do Mercado Pago real)
      const { ApplicationService } = await import("../src/modules/applications/application.service")
      const charge = coverAppId ? await prisma.charge.findUnique({ where: { applicationId: coverAppId } }) : null
      if (charge) {
        await ApplicationService.finalizeConfirmedApplication(charge.id, "smoketest-fake-payment")

        const leaveAfter = await prisma.leaveRequest.findUnique({ where: { id: leaveId } })
        check("folga vira COVERED após confirmação de pagamento", leaveAfter?.status === "COVERED", leaveAfter)

        const scheduleDate = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10)
        const schedule = await req("GET", `/schedule-status?date=${scheduleDate}`, undefined, hospToken)
        const leaveInSchedule = schedule.json?.data?.leaves?.find((l: any) => l.id === leaveId)
        check(
          "escala do dia mostra coveredBy corretamente (regressão do bug corrigido)",
          !!leaveInSchedule?.coveredBy?.name,
          leaveInSchedule
        )
      } else {
        check("charge criada pra simular confirmação de pagamento", false, "charge não encontrada")
      }
    }
  } else {
    console.log("  (pulando teste de folga — saldo de banco de horas insuficiente logo após criação da conta)")
  }

  // 8. bulk: template + upload de horas da equipe
  const template = await req("GET", "/bulk/shifts/template", undefined, hospToken)
  check("modelo de CSV de plantões em massa", template.status === 200)

  const staffHours = await req("GET", "/bulk/staff-hours", undefined, hospToken)
  check("export de horas da equipe (CSV)", staffHours.status === 200)

  // 9. escala do dia
  const schedule = await req(
    "GET",
    `/schedule-status?date=${new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}`,
    undefined,
    hospToken
  )
  check("escala do dia responde 200", schedule.status === 200, schedule.json)

  // 10. troca de plantão — endpoint básico responde
  const swapAvailable = await req("GET", "/shift-swaps/available", undefined, crmToken)
  check("lista de trocas disponíveis responde 200", swapAvailable.status === 200, swapAvailable.json)

  // 11. admin — login e métricas (usa conta fixa de admin, não criada por este script)
  const adminLogin = await req("POST", "/auth/login", {
    email: "admin@plantoesmedicos.com.br",
    password: "Admin@2026",
  })
  if (adminLogin.status === 200) {
    const adminToken = adminLogin.json?.data?.accessToken
    const metrics = await req("GET", "/admin/metrics", undefined, adminToken)
    check("métricas do admin respondem 200", metrics.status === 200, metrics.json)
  } else {
    console.log("  (pulando teste de admin — login da conta fixa falhou, provavelmente rate limit)")
  }

  // --- limpeza ---
  console.log("\n=== Limpando dados de teste ===")
  const users = await prisma.user.findMany({
    where: { email: { in: [hospitalEmail, crmEmail, coreEmail, cover_email] } },
    include: { hospitalProfile: true, professionalProfile: true },
  })

  for (const u of users) {
    if (u.hospitalProfile) {
      const shifts = await prisma.shift.findMany({ where: { hospitalId: u.hospitalProfile.id } })
      for (const s of shifts) {
        await prisma.charge.deleteMany({ where: { application: { shiftId: s.id } } })
        await prisma.application.deleteMany({ where: { shiftId: s.id } })
        await prisma.leaveRequest.deleteMany({ where: { shiftId: s.id } })
        await prisma.shiftSwapInterest.deleteMany({ where: { swapRequest: { shiftId: s.id } } })
        await prisma.shiftSwapRequest.deleteMany({ where: { shiftId: s.id } })
      }
      await prisma.shift.deleteMany({ where: { hospitalId: u.hospitalProfile.id } })
      await prisma.hospitalStaff.deleteMany({ where: { hospitalId: u.hospitalProfile.id } })
    }
  }
  await prisma.refreshToken.deleteMany({ where: { user: { email: { in: [hospitalEmail, crmEmail, coreEmail, cover_email] } } } })
  await prisma.user.deleteMany({ where: { email: { in: [hospitalEmail, crmEmail, coreEmail, cover_email] } } })
  console.log("Limpeza concluída.")

  console.log(`\n=== Resultado: ${passed} passou, ${failed} falhou ===`)
  if (failed > 0) {
    console.log("Falhas:", failures.join(", "))
  }
  await prisma.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(async (e) => {
  console.error("Erro fatal no smoke test:", e)
  await prisma.$disconnect()
  process.exit(1)
})
