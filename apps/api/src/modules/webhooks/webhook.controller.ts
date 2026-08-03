import { Request, Response, NextFunction } from "express"
import { fetchPayment } from "../../shared/services/payment.service"
import { ApplicationService } from "../applications/application.service"

export class WebhookController {
  /**
   * Mercado Pago envia { type: "payment", data: { id } } (ou ?topic=payment&id=).
   * Sempre respondemos 200 rapidamente — o Mercado Pago reenvia em caso de erro,
   * e nós validamos o pagamento diretamente na API deles em vez de confiar no payload.
   */
  static async mercadopago(req: Request, res: Response, next: NextFunction) {
    try {
      const type = (req.body?.type ?? req.query.topic) as string | undefined
      const paymentId = (req.body?.data?.id ?? req.query.id) as string | undefined

      if (type !== "payment" || !paymentId) {
        res.status(200).json({ received: true })
        return
      }

      const payment = await fetchPayment(String(paymentId))
      if (payment?.status === "approved" && payment.externalReference) {
        await ApplicationService.finalizeConfirmedApplication(
          payment.externalReference,
          String(paymentId)
        )
      }

      res.status(200).json({ received: true })
    } catch (error) {
      next(error)
    }
  }
}
