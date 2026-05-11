import { prisma } from "../../prisma/client"
import { sendWhatsAppText } from "./whatsapp.service"

const WEB_URL = process.env.WEB_URL ?? "https://plantoes-medicos-web.vercel.app"

interface ShiftData {
  id: string
  title: string
  description: string
  date: Date
  startTime: string
  endTime: string
  location: string
  slots: number
  specialtyId: string
  specialty: { name: string }
  hospital: { name: string; city: string; state: string }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date)
}

function buildMessage(shift: ShiftData): string {
  const vagas = shift.slots === 1 ? "1 vaga" : `${shift.slots} vagas`
  const link = `${WEB_URL}/vagas/${shift.id}`

  return [
    `🏥 *Novo Plantão Disponível — ${shift.specialty.name}*`,
    ``,
    `*Hospital:* ${shift.hospital.name}`,
    `*Local:* ${shift.location} — ${shift.hospital.city}/${shift.hospital.state}`,
    `*Data:* ${formatDate(shift.date)}`,
    `*Horário:* ${shift.startTime} às ${shift.endTime}`,
    `*Vagas:* ${vagas}`,
    ``,
    `${shift.description}`,
    ``,
    `👉 Veja os detalhes e candidate-se:`,
    link,
  ].join("\n")
}

export async function notifyProfessionalsAboutNewShift(shift: ShiftData): Promise<void> {
  try {
    // busca todos os profissionais ativos com essa especialidade
    const professionals = await prisma.professionalProfile.findMany({
      where: {
        specialties: { some: { specialtyId: shift.specialtyId } },
        user: { status: "ACTIVE" },
      },
      select: { phone: true },
    })

    if (professionals.length === 0) return

    const message = buildMessage(shift)

    // envia em sequência com pequeno delay para não sobrecarregar a API
    for (const prof of professionals) {
      await sendWhatsAppText(prof.phone, message)
      // pausa de 500ms entre envios
      await new Promise((r) => setTimeout(r, 500))
    }

    console.info(`[ShiftNotification] Notificações enviadas para ${professionals.length} profissional(is) — plantão ${shift.id}`)
  } catch (err) {
    // nunca propaga erro — notificação é best-effort
    console.error("[ShiftNotification] Erro ao enviar notificações:", err)
  }
}
