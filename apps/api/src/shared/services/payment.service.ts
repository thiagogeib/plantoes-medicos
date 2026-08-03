import { AppError } from "../errors/AppError"

/** Taxa fixa cobrada do profissional ao confirmar uma vaga (em centavos). */
export function getPlatformFeeCents(): number {
  return Number(process.env.PLATFORM_FEE_CENTS ?? 1500)
}

function getAccessToken(): string {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) {
    throw new AppError(
      "O pagamento da taxa de confirmação ainda não está configurado na plataforma. Tente novamente mais tarde.",
      503,
      "PAYMENT_NOT_CONFIGURED"
    )
  }
  return accessToken
}

interface CreatePreferenceInput {
  chargeId: string
  amountCents: number
  description: string
  payerEmail: string
}

export interface CreatePreferenceResult {
  preferenceId: string
  checkoutUrl: string
}

export async function createPaymentPreference(
  input: CreatePreferenceInput
): Promise<CreatePreferenceResult> {
  const accessToken = getAccessToken()

  const { MercadoPagoConfig, Preference } = await import("mercadopago")
  const client = new MercadoPagoConfig({ accessToken })
  const preference = new Preference(client)

  const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:3000"
  const apiUrl = process.env.API_URL ?? "http://localhost:3333"

  const result = await preference.create({
    body: {
      items: [
        {
          id: input.chargeId,
          title: input.description,
          quantity: 1,
          unit_price: input.amountCents / 100,
          currency_id: "BRL",
        },
      ],
      payer: { email: input.payerEmail },
      external_reference: input.chargeId,
      notification_url: `${apiUrl}/api/v1/webhooks/mercadopago`,
      back_urls: {
        success: `${webAppUrl}/profissional/candidaturas`,
        failure: `${webAppUrl}/profissional/candidaturas`,
        pending: `${webAppUrl}/profissional/candidaturas`,
      },
    },
  })

  if (!result.id || !result.init_point) {
    throw new AppError("Não foi possível iniciar o pagamento", 502, "PAYMENT_PROVIDER_ERROR")
  }

  return { preferenceId: result.id, checkoutUrl: result.init_point }
}

export interface PaymentInfo {
  status: string | null
  externalReference: string | null
}

export async function fetchPayment(paymentId: string): Promise<PaymentInfo | null> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) return null

  const { MercadoPagoConfig, Payment } = await import("mercadopago")
  const client = new MercadoPagoConfig({ accessToken })
  const payment = new Payment(client)
  const result = await payment.get({ id: paymentId })
  return {
    status: result.status ?? null,
    externalReference: result.external_reference ?? null,
  }
}

export function isPaymentConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN)
}
