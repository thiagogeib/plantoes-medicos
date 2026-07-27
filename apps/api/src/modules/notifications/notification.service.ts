import { prisma } from "../../prisma/client"
import { NotFoundError, ForbiddenError } from "../../shared/errors/AppError"

export class NotificationQueryService {
  static async list(userId: string, limit = 20) {
    const [data, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({ where: { userId, read: false } }),
    ])
    return { data, unreadCount }
  }

  static async markRead(id: string, userId: string) {
    const notification = await prisma.notification.findUnique({ where: { id } })
    if (!notification) throw new NotFoundError("Notificação não encontrada")
    if (notification.userId !== userId) throw new ForbiddenError("Sem permissão para esta notificação")

    return prisma.notification.update({ where: { id }, data: { read: true } })
  }

  static async markAllRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
  }
}
