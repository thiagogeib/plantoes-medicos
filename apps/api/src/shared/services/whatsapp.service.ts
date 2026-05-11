const ZAPI_BASE = "https://api.z-api.io/instances"
const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID
const TOKEN = process.env.ZAPI_TOKEN
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")

  // já tem código do país
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits
  }

  // número brasileiro sem código do país (10 ou 11 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }

  return null
}

export async function sendWhatsAppText(phone: string, message: string): Promise<void> {
  if (!INSTANCE_ID || !TOKEN) {
    console.warn("[WhatsApp] ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados — mensagem não enviada")
    return
  }

  const normalized = normalizePhone(phone)
  if (!normalized) {
    console.warn(`[WhatsApp] Número inválido: ${phone}`)
    return
  }

  console.info(`[WhatsApp] Enviando para ${normalized} — Client-Token: ${CLIENT_TOKEN ? "configurado" : "AUSENTE"}`)

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (CLIENT_TOKEN) headers["Client-Token"] = CLIENT_TOKEN

  try {
    const res = await fetch(
      `${ZAPI_BASE}/${INSTANCE_ID}/token/${TOKEN}/send-text`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: normalized, message }),
      }
    )

    const body = await res.text()
    if (!res.ok) {
      console.error(`[WhatsApp] Erro ${res.status} ao enviar para ${normalized}: ${body}`)
    } else {
      console.info(`[WhatsApp] Mensagem enviada com sucesso para ${normalized}: ${body}`)
    }
  } catch (err) {
    console.error(`[WhatsApp] Falha na chamada HTTP para ${normalized}:`, err)
  }
}
