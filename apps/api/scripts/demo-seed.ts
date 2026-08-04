/**
 * Popula a plataforma com um conjunto rico de dados de demonstração — hospitais,
 * profissionais e plantões cobrindo todos os status e fluxos do sistema (candidaturas,
 * trocas, folgas, equipe, notificações). Idempotente: pode rodar de novo sem duplicar.
 *
 * Uso:
 *   cd apps/api && npx ts-node -T scripts/demo-seed.ts
 */
import "dotenv/config"
import argon2 from "argon2"
import {
  PrismaClient,
  UserRole,
  UserStatus,
  ShiftStatus,
  ApplicationStatus,
  ChargeStatus,
  StaffStatus,
  StaffType,
  SwapRequestStatus,
  SwapInterestStatus,
  LeaveRequestStatus,
  CouncilType,
  CompensationType,
} from "@prisma/client"
import { geocodeByZipCode } from "../src/shared/services/geocoding.service"

const prisma = new PrismaClient()
const DEMO_PASSWORD = "Demo@2026"

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
}

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d
}

async function upsertHospital(input: {
  email: string
  name: string
  cnpj: string
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}) {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, ARGON2_OPTIONS)
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {},
    create: {
      email: input.email,
      passwordHash,
      role: UserRole.HOSPITAL,
      status: UserStatus.ACTIVE,
      hospitalProfile: {
        create: {
          name: input.name,
          cnpj: input.cnpj,
          phone: "11988880000",
          street: input.street,
          number: input.number,
          neighborhood: input.neighborhood,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
        },
      },
    },
    include: { hospitalProfile: true },
  })
  const profile = user.hospitalProfile ?? (await prisma.hospitalProfile.findUnique({ where: { userId: user.id } }))
  if (profile!.latitude == null) {
    const geo = await geocodeByZipCode(input.zipCode)
    if (geo) {
      await prisma.hospitalProfile.update({
        where: { id: profile!.id },
        data: {
          street: input.street,
          number: input.number,
          neighborhood: input.neighborhood,
          zipCode: input.zipCode,
          latitude: geo.latitude,
          longitude: geo.longitude,
        },
      })
    } else {
      console.warn(`  ⚠ Geocodificação falhou para ${input.name} (CEP ${input.zipCode}) — mapa não terá pin para este hospital`)
    }
  }
  return { userId: user.id, hospitalId: profile!.id }
}

async function upsertProfessional(input: {
  email: string
  name: string
  cpf: string
  councilType: CouncilType
  councilNumber: string
  councilState: string
  city: string
  state: string
  zipCode: string
  specialtyIds: string[]
}) {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, ARGON2_OPTIONS)
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {},
    create: {
      email: input.email,
      passwordHash,
      role: UserRole.PROFESSIONAL,
      status: UserStatus.ACTIVE,
      professionalProfile: {
        create: {
          name: input.name,
          cpf: input.cpf,
          phone: "11977770000",
          councilType: input.councilType,
          councilNumber: input.councilNumber,
          councilState: input.councilState,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          specialties: { create: input.specialtyIds.map((specialtyId) => ({ specialtyId })) },
        },
      },
    },
    include: { professionalProfile: true },
  })
  const profile =
    user.professionalProfile ?? (await prisma.professionalProfile.findUnique({ where: { userId: user.id } }))
  if (profile!.latitude == null) {
    const geo = await geocodeByZipCode(input.zipCode)
    if (geo) {
      await prisma.professionalProfile.update({
        where: { id: profile!.id },
        data: { zipCode: input.zipCode, latitude: geo.latitude, longitude: geo.longitude },
      })
    } else {
      console.warn(`  ⚠ Geocodificação falhou para ${input.name} (CEP ${input.zipCode}) — busca por raio não funcionará para ele`)
    }
  }
  return { userId: user.id, professionalId: profile!.id }
}

async function upsertStaffLink(
  hospitalId: string,
  professionalId: string,
  data: { status: StaffStatus; type: StaffType; hourBankMinutes?: number; availableDaysOff?: number }
) {
  return prisma.hospitalStaff.upsert({
    where: { hospitalId_professionalId: { hospitalId, professionalId } },
    update: data,
    create: {
      hospitalId,
      professionalId,
      status: data.status,
      type: data.type,
      hourBankMinutes: data.hourBankMinutes ?? 0,
      availableDaysOff: data.availableDaysOff ?? 0,
      joinedAt: data.status === StaffStatus.ACTIVE ? new Date() : undefined,
    },
  })
}

async function findOrCreateShift(input: {
  hospitalId: string
  specialtyId: string
  title: string
  description: string
  date: Date
  startTime: string
  endTime: string
  location: string
  slots?: number
  filledSlots?: number
  status?: ShiftStatus
  compensationType?: CompensationType
  requiredCouncilType?: CouncilType
}) {
  const existing = await prisma.shift.findFirst({ where: { hospitalId: input.hospitalId, title: input.title } })
  if (existing) return existing
  return prisma.shift.create({
    data: {
      hospitalId: input.hospitalId,
      specialtyId: input.specialtyId,
      title: input.title,
      description: input.description,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      slots: input.slots ?? 1,
      filledSlots: input.filledSlots ?? 0,
      status: input.status ?? ShiftStatus.OPEN,
      compensationType: input.compensationType ?? CompensationType.MONEY,
      compensationNote: input.compensationType === CompensationType.HOUR_BANK ? "12h de banco de horas" : "R$ 1.200",
      requiredCouncilType: input.requiredCouncilType ?? CouncilType.CRM,
    },
  })
}

async function upsertApplication(input: {
  shiftId: string
  professionalId: string
  status: ApplicationStatus
  message?: string
  rejectionReason?: string
  withCharge?: boolean
}) {
  const application = await prisma.application.upsert({
    where: { shiftId_professionalId: { shiftId: input.shiftId, professionalId: input.professionalId } },
    update: { status: input.status, rejectionReason: input.rejectionReason },
    create: {
      shiftId: input.shiftId,
      professionalId: input.professionalId,
      status: input.status,
      message: input.message,
      rejectionReason: input.rejectionReason,
    },
  })
  if (input.withCharge) {
    await prisma.charge.upsert({
      where: { applicationId: application.id },
      update: { status: ChargeStatus.PAID },
      create: {
        applicationId: application.id,
        professionalId: input.professionalId,
        amountCents: 1500,
        status: ChargeStatus.PAID,
        paidAt: new Date(),
      },
    })
  }
  return application
}

async function main() {
  console.log("=== Demo seed: iniciando ===")

  const specialtiesByName = new Map(
    (await prisma.specialty.findMany()).map((s) => [s.name, s.id] as const)
  )
  const specialtyId = (name: string) => {
    const id = specialtiesByName.get(name)
    if (!id) throw new Error(`Especialidade "${name}" não encontrada — rode o seed principal antes`)
    return id
  }

  // ── Hospitais ────────────────────────────────────────────────────────────
  const h1 = await upsertHospital({
    email: "hospital.saude@gmail.com",
    name: "Hospital Saúde Teste",
    cnpj: "11222333000181",
    street: "Avenida Paulista",
    number: "1578",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    zipCode: "01310200",
  })
  const h2 = await upsertHospital({
    email: "hospital.vidanova@demo.plantoesmed.com.br",
    name: "Hospital Vida Nova",
    cnpj: "44555666000122",
    street: "Avenida Atlântica",
    number: "1702",
    neighborhood: "Copacabana",
    city: "Rio de Janeiro",
    state: "RJ",
    zipCode: "22021001",
  })
  console.log("✓ Hospitais:", h1.hospitalId, h2.hospitalId)

  // ── Profissionais ────────────────────────────────────────────────────────
  const p1 = await upsertProfessional({
    email: "profissional.teste@gmail.com",
    name: "Profissional Teste",
    cpf: "12345678901",
    councilType: CouncilType.CRM,
    councilNumber: "123456",
    councilState: "SP",
    city: "São Paulo",
    state: "SP",
    zipCode: "01311000",
    specialtyIds: [specialtyId("Clínica Médica"), specialtyId("UTI Adulto")],
  })
  const p2ExistingProfile = await prisma.professionalProfile.findFirst({ where: { name: "Medico Cobertura" } })
  let p2: { userId: string; professionalId: string }
  if (p2ExistingProfile) {
    const passwordHash = await argon2.hash(DEMO_PASSWORD, ARGON2_OPTIONS)
    await prisma.user.update({ where: { id: p2ExistingProfile.userId }, data: { passwordHash } })
    p2 = { userId: p2ExistingProfile.userId, professionalId: p2ExistingProfile.id }
    if (p2ExistingProfile.latitude == null) {
      const zip = p2ExistingProfile.zipCode ?? "01311000"
      const geo = await geocodeByZipCode(zip)
      if (geo) {
        await prisma.professionalProfile.update({
          where: { id: p2ExistingProfile.id },
          data: { zipCode: zip, latitude: geo.latitude, longitude: geo.longitude },
        })
      }
    }
  } else {
    p2 = await upsertProfessional({
      email: "medico.cobertura@demo.plantoesmed.com.br",
      name: "Medico Cobertura",
      cpf: "99999999999",
      councilType: CouncilType.CRM,
      councilNumber: "999999",
      councilState: "SP",
      city: "São Paulo",
      state: "SP",
      zipCode: "01311000",
      specialtyIds: [specialtyId("Cardiologia")],
    })
  }
  const p3 = await upsertProfessional({
    email: "juliana.alves@demo.plantoesmed.com.br",
    name: "Juliana Alves",
    cpf: "22233344455",
    councilType: CouncilType.COREN,
    councilNumber: "778899",
    councilState: "SP",
    city: "São Paulo",
    state: "SP",
    zipCode: "05407002",
    specialtyIds: [specialtyId("Emergência"), specialtyId("Pediatria")],
  })
  const p4 = await upsertProfessional({
    email: "roberto.lima@demo.plantoesmed.com.br",
    name: "Roberto Lima",
    cpf: "33344455566",
    councilType: CouncilType.CRM,
    councilNumber: "445566",
    councilState: "RJ",
    city: "Rio de Janeiro",
    state: "RJ",
    zipCode: "20040020",
    specialtyIds: [specialtyId("Ortopedia"), specialtyId("Cirurgia Geral")],
  })
  console.log("✓ Profissionais:", p1.professionalId, p2.professionalId, p3.professionalId, p4.professionalId)

  // ── Equipe (HospitalStaff) — cobre INVITED / ACTIVE / INACTIVE, FIXO / AVULSO ──
  await upsertStaffLink(h1.hospitalId, p1.professionalId, {
    status: StaffStatus.ACTIVE,
    type: StaffType.AVULSO,
    hourBankMinutes: 840,
    availableDaysOff: 2,
  })
  await upsertStaffLink(h2.hospitalId, p1.professionalId, {
    status: StaffStatus.ACTIVE,
    type: StaffType.FIXO,
    hourBankMinutes: 120,
    availableDaysOff: 1,
  })
  await upsertStaffLink(h1.hospitalId, p2.professionalId, {
    status: StaffStatus.ACTIVE,
    type: StaffType.FIXO,
    hourBankMinutes: 0,
    availableDaysOff: 3,
  })
  // FIXO é obrigatório — solicitar folga exige vínculo fixo ativo (ver leave-request.service.ts).
  // hourBankMinutes reflete o saldo JÁ DESCONTADO da folga de 720min criada mais abaixo
  // (assim como o fluxo real desconta na hora do pedido), então fica pouco de propósito.
  await upsertStaffLink(h2.hospitalId, p4.professionalId, {
    status: StaffStatus.ACTIVE,
    type: StaffType.FIXO,
    hourBankMinutes: 60,
    availableDaysOff: 0,
  })
  // convite ainda pendente — profissional 3 nunca aceitou
  await upsertStaffLink(h1.hospitalId, p3.professionalId, {
    status: StaffStatus.INVITED,
    type: StaffType.AVULSO,
  })
  console.log("✓ Vínculos de equipe criados/atualizados")

  // ── Plantões cobrindo todos os status ────────────────────────────────────
  const shiftRisco = await findOrCreateShift({
    hospitalId: h1.hospitalId,
    specialtyId: specialtyId("UTI Adulto"),
    title: "Plantão UTI Adulto — Feriado",
    description: "Cobertura de feriado na UTI adulto, urgente.",
    date: daysFromNow(1),
    startTime: "07:00",
    endTime: "19:00",
    location: "Ala UTI",
    status: ShiftStatus.OPEN,
  })

  const shiftComCandidato = await findOrCreateShift({
    hospitalId: h1.hospitalId,
    specialtyId: specialtyId("Clínica Médica"),
    title: "Plantão Clínica Médica — Noturno",
    description: "Plantão noturno de clínica médica, enfermaria geral.",
    date: daysFromNow(5),
    startTime: "19:00",
    endTime: "07:00",
    location: "Enfermaria Geral",
    requiredCouncilType: CouncilType.COREN,
  })
  await upsertApplication({
    shiftId: shiftComCandidato.id,
    professionalId: p3.professionalId,
    status: ApplicationStatus.PENDING,
    message: "Tenho disponibilidade e experiência na especialidade.",
  })

  const shiftPendenteConfirmacao = await findOrCreateShift({
    hospitalId: h2.hospitalId,
    specialtyId: specialtyId("Ortopedia"),
    title: "Plantão Ortopedia — Ambulatório",
    description: "Atendimento ambulatorial de ortopedia.",
    date: daysFromNow(7),
    startTime: "08:00",
    endTime: "14:00",
    location: "Ambulatório",
  })
  await upsertApplication({
    shiftId: shiftPendenteConfirmacao.id,
    professionalId: p4.professionalId,
    status: ApplicationStatus.PENDING_CONFIRMATION,
  })

  const shiftPreenchido = await findOrCreateShift({
    hospitalId: h1.hospitalId,
    specialtyId: specialtyId("Pediatria"),
    title: "Plantão Pediatria — Fim de semana",
    description: "Plantão de pediatria no fim de semana.",
    date: daysFromNow(3),
    startTime: "08:00",
    endTime: "20:00",
    location: "Ala Pediátrica",
    status: ShiftStatus.FILLED,
    filledSlots: 1,
  })
  await upsertApplication({
    shiftId: shiftPreenchido.id,
    professionalId: p2.professionalId,
    status: ApplicationStatus.ACCEPTED,
    withCharge: true,
  })

  const shiftCancelado = await findOrCreateShift({
    hospitalId: h2.hospitalId,
    specialtyId: specialtyId("Cardiologia"),
    title: "Plantão Cardiologia — Cancelado pelo hospital",
    description: "Plantão cancelado por reorganização de escala.",
    date: daysFromNow(10),
    startTime: "08:00",
    endTime: "14:00",
    location: "Pronto-Socorro",
    status: ShiftStatus.CANCELLED,
  })
  await upsertApplication({
    shiftId: shiftCancelado.id,
    professionalId: p4.professionalId,
    status: ApplicationStatus.REJECTED,
    rejectionReason: "O plantão foi cancelado pelo hospital",
  })

  const shiftConcluido = await findOrCreateShift({
    hospitalId: h1.hospitalId,
    specialtyId: specialtyId("Clínica Médica"),
    title: "Plantão Clínica Médica — Concluído",
    description: "Plantão já realizado, usado no histórico e nas estatísticas do mês.",
    date: daysFromNow(-2),
    startTime: "07:00",
    endTime: "19:00",
    location: "Enfermaria Geral",
    status: ShiftStatus.COMPLETED,
    filledSlots: 1,
  })
  await upsertApplication({
    shiftId: shiftConcluido.id,
    professionalId: p1.professionalId,
    status: ApplicationStatus.ACCEPTED,
    withCharge: true,
  })

  const shiftRejeitado = await findOrCreateShift({
    hospitalId: h1.hospitalId,
    specialtyId: specialtyId("Emergência"),
    title: "Plantão Emergência — Candidatura recusada",
    description: "Vaga de emergência com candidatura recusada pelo hospital.",
    date: daysFromNow(6),
    startTime: "19:00",
    endTime: "07:00",
    location: "Pronto-Socorro",
    requiredCouncilType: CouncilType.COREN,
  })
  await upsertApplication({
    shiftId: shiftRejeitado.id,
    professionalId: p3.professionalId,
    status: ApplicationStatus.REJECTED,
    rejectionReason: "Vaga preenchida por outro profissional com mais experiência na unidade.",
  })

  console.log("✓ Plantões criados cobrindo todos os status")

  // ── Troca de plantão (ShiftSwapRequest) — aceito por p2, oferecido, com interesse de p4 ──
  const shiftParaTroca = await findOrCreateShift({
    hospitalId: h1.hospitalId,
    specialtyId: specialtyId("Cardiologia"),
    title: "Plantão Cardiologia — Aceito, aberto para troca",
    description: "Profissional aceitou mas pediu para trocar por imprevisto pessoal.",
    date: daysFromNow(4),
    startTime: "08:00",
    endTime: "20:00",
    location: "Centro Cirúrgico",
    status: ShiftStatus.FILLED,
    filledSlots: 1,
  })
  await upsertApplication({
    shiftId: shiftParaTroca.id,
    professionalId: p2.professionalId,
    status: ApplicationStatus.ACCEPTED,
    withCharge: true,
  })
  const swapRequest =
    (await prisma.shiftSwapRequest.findFirst({ where: { shiftId: shiftParaTroca.id } })) ??
    (await prisma.shiftSwapRequest.create({
      data: {
        shiftId: shiftParaTroca.id,
        requestingProfessionalId: p2.professionalId,
        status: SwapRequestStatus.OPEN,
        reason: "Imprevisto familiar, preciso trocar este plantão.",
      },
    }))
  await prisma.shiftSwapInterest.upsert({
    where: { swapRequestId_professionalId: { swapRequestId: swapRequest.id, professionalId: p4.professionalId } },
    update: {},
    create: { swapRequestId: swapRequest.id, professionalId: p4.professionalId, status: SwapInterestStatus.PENDING },
  })
  console.log("✓ Troca de plantão com interesse registrado")

  // ── Folga (LeaveRequest) — aberta aguardando cobertura ──────────────────
  const shiftDaFolga = await findOrCreateShift({
    hospitalId: h2.hospitalId,
    specialtyId: specialtyId("Ortopedia"),
    title: "Cobertura de folga — Roberto Lima",
    description: "Vaga aberta automaticamente para cobrir a folga aprovada.",
    date: daysFromNow(8),
    startTime: "08:00",
    endTime: "20:00",
    location: "Ambulatório",
  })
  const existingLeave = await prisma.leaveRequest.findUnique({ where: { shiftId: shiftDaFolga.id } })
  if (!existingLeave) {
    await prisma.leaveRequest.create({
      data: {
        shiftId: shiftDaFolga.id,
        professionalId: p4.professionalId,
        date: daysFromNow(8),
        durationMinutes: 720,
        reason: "Compromisso pessoal",
        status: LeaveRequestStatus.APPROVED_PENDING_COVERAGE,
      },
    })
  }

  // folga já coberta (histórico)
  const shiftFolgaCoberta = await findOrCreateShift({
    hospitalId: h1.hospitalId,
    specialtyId: specialtyId("Clínica Médica"),
    title: "Cobertura de folga — Medico Cobertura",
    description: "Folga que já foi coberta por outro profissional.",
    date: daysFromNow(-5),
    startTime: "08:00",
    endTime: "20:00",
    location: "Enfermaria Geral",
    status: ShiftStatus.COMPLETED,
    filledSlots: 1,
  })
  const existingLeaveCovered = await prisma.leaveRequest.findUnique({ where: { shiftId: shiftFolgaCoberta.id } })
  if (!existingLeaveCovered) {
    await prisma.leaveRequest.create({
      data: {
        shiftId: shiftFolgaCoberta.id,
        professionalId: p2.professionalId,
        date: daysFromNow(-5),
        durationMinutes: 720,
        reason: "Consulta médica",
        status: LeaveRequestStatus.COVERED,
      },
    })
  }
  await upsertApplication({
    shiftId: shiftFolgaCoberta.id,
    professionalId: p1.professionalId,
    status: ApplicationStatus.ACCEPTED,
    withCharge: true,
  })
  console.log("✓ Folgas criadas (aberta e coberta)")

  // ── Afastamento (Absence) ────────────────────────────────────────────────
  const existingAbsence = await prisma.absence.findFirst({ where: { hospitalId: h1.hospitalId, professionalId: p2.professionalId } })
  if (!existingAbsence) {
    await prisma.absence.create({
      data: {
        hospitalId: h1.hospitalId,
        professionalId: p2.professionalId,
        type: "LICENCA",
        startDate: daysFromNow(15),
        endDate: daysFromNow(45),
        note: "Licença médica de 30 dias.",
      },
    })
  }
  console.log("✓ Afastamento registrado")

  // ── Notificações — um exemplo de cada tipo principal para o profissional demo ──
  const notifTargets = [
    { type: "NEW_APPLICATION" as const, title: "Nova candidatura recebida", message: 'Você recebeu uma nova candidatura para "Plantão Clínica Médica — Noturno"', link: `/hospital/plantoes/${shiftComCandidato.id}`, userId: h1.userId },
    { type: "APPLICATION_PENDING_CONFIRMATION" as const, title: "Você foi aprovado! Confirme sua vaga", message: 'O hospital aprovou você para "Plantão Ortopedia — Ambulatório". Confirme e pague a taxa.', link: "/profissional/candidaturas", userId: p4.userId },
    { type: "APPLICATION_REJECTED" as const, title: "Candidatura recusada", message: 'Sua candidatura para "Plantão Emergência — Candidatura recusada" foi recusada', link: "/profissional/candidaturas", userId: p3.userId },
    { type: "APPLICATION_CONFIRMED" as const, title: "Vaga confirmada", message: 'O profissional confirmou e pagou a taxa para "Plantão Pediatria — Fim de semana"', link: `/hospital/plantoes/${shiftPreenchido.id}`, userId: h1.userId },
    { type: "SWAP_INTEREST" as const, title: "Interesse em sua troca", message: "Um profissional demonstrou interesse na sua solicitação de troca", link: "/profissional/trocas", userId: p2.userId },
    { type: "LEAVE_REQUEST_OPENED" as const, title: "Nova solicitação de folga", message: "Um profissional solicitou folga e a vaga de cobertura foi aberta", link: "/hospital/folgas", userId: h2.userId },
    { type: "LEAVE_COVERED" as const, title: "Folga coberta", message: 'Sua folga em "Cobertura de folga — Medico Cobertura" foi coberta', link: "/profissional/folgas", userId: p2.userId },
    { type: "STAFF_INVITED" as const, title: "Convite de hospital", message: "Hospital Saúde Teste convidou você para fazer parte da equipe", link: "/profissional/hospitais", userId: p3.userId },
    { type: "SHIFT_CANCELLED" as const, title: "Plantão cancelado", message: 'O plantão "Plantão Cardiologia — Cancelado pelo hospital" foi cancelado pelo hospital', link: "/profissional/candidaturas", userId: p4.userId },
  ]
  for (const n of notifTargets) {
    const already = await prisma.notification.findFirst({ where: { userId: n.userId, type: n.type, title: n.title } })
    if (!already) {
      await prisma.notification.create({ data: n })
    }
  }
  console.log("✓ Notificações de exemplo criadas")

  const p1Email = (await prisma.user.findUnique({ where: { id: p1.userId } }))!.email
  const p2Email = (await prisma.user.findUnique({ where: { id: p2.userId } }))!.email

  console.log("\n=== Demo seed concluído ===")
  console.log(`
Contas (senha ${DEMO_PASSWORD} para todas, exceto onde indicado):
  ADMIN          admin@plantoesmedicos.com.br               senha: Admin@2026
  HOSPITAL 1     hospital.saude@gmail.com                   (Hospital Saúde Teste — SP) — senha: Teste@2026
  HOSPITAL 2     hospital.vidanova@demo.plantoesmed.com.br  (Hospital Vida Nova — RJ)
  PROFISSIONAL 1 ${p1Email}       (CRM, vínculo ativo nos 2 hospitais) — senha: Teste@2026
  PROFISSIONAL 2 ${p2Email}          (CRM, tem plantão aberto pra troca)
  PROFISSIONAL 3 juliana.alves@demo.plantoesmed.com.br       (COREN, sem vínculo — vitrine pública)
  PROFISSIONAL 4 roberto.lima@demo.plantoesmed.com.br        (CRM, folga em aberto p/ cobertura)
`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
