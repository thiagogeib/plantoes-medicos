import { NotificationType } from "@prisma/client"
import { prisma } from "../../prisma/client"

interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

export async function notify(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({ data: input })
  } catch (err) {
    console.error("[Notification] Falha ao criar notificação:", err)
  }
}
