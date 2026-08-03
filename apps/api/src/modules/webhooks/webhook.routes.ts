import { Router } from "express"
import { WebhookController } from "./webhook.controller"

export const webhookRouter = Router()

webhookRouter.post("/mercadopago", WebhookController.mercadopago)
