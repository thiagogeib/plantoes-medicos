const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM ?? "PlantoesMed <onboarding@resend.dev>"

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn(`[Email] RESEND_API_KEY não configurado — email não enviado para ${to}: ${subject}`)
    return
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    })

    if (!res.ok) {
      console.error(`[Email] Erro ${res.status} ao enviar para ${to}:`, await res.text())
    } else {
      console.info(`[Email] Enviado com sucesso para ${to}: ${subject}`)
    }
  } catch (err) {
    console.error(`[Email] Falha na chamada HTTP para ${to}:`, err)
  }
}

function emailShell(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f8fafc; padding:32px;">
      <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px; border:1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px;">
          <span style="font-size:18px; font-weight:700; color:#0f172a;">PlantoesMed</span>
        </div>
        <h1 style="font-size:18px; color:#0f172a; margin:0 0 12px;">${title}</h1>
        ${bodyHtml}
        <p style="font-size:12px; color:#94a3b8; margin-top:32px;">PlantoesMed — plataforma de plantões médicos</p>
      </div>
    </div>
  `
}

export async function sendVerificationEmail(to: string, link: string): Promise<void> {
  const html = emailShell(
    "Confirme seu e-mail",
    `
      <p style="font-size:14px; color:#475569; line-height:1.6;">
        Falta pouco para ativar sua conta na PlantoesMed. Clique no botão abaixo para confirmar seu e-mail.
        Este link expira em 24 horas.
      </p>
      <a href="${link}" style="display:inline-block; margin-top:16px; background:#4F46E5; color:#fff; text-decoration:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600;">
        Confirmar e-mail
      </a>
      <p style="font-size:12px; color:#94a3b8; margin-top:20px;">
        Se você não criou essa conta, pode ignorar este email com segurança.
      </p>
    `
  )
  await sendEmail(to, "Confirme seu e-mail — PlantoesMed", html)
}

export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  const html = emailShell(
    "Redefinição de senha",
    `
      <p style="font-size:14px; color:#475569; line-height:1.6;">
        Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha.
        Este link expira em 1 hora.
      </p>
      <a href="${link}" style="display:inline-block; margin-top:16px; background:#2563eb; color:#fff; text-decoration:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600;">
        Redefinir senha
      </a>
      <p style="font-size:12px; color:#94a3b8; margin-top:20px;">
        Se você não pediu essa redefinição, pode ignorar este email com segurança.
      </p>
    `
  )
  await sendEmail(to, "Redefinição de senha — PlantoesMed", html)
}
