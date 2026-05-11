import { UserRole, UserStatus } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { NotFoundError, AppError } from "../../shared/errors/AppError"
import { paginate, paginationMeta } from "../../shared/helpers/pagination"

interface ListUsersFilters {
  role?: UserRole
  status?: UserStatus
  page: number
  limit: number
}

export class AdminService {
  static async getMetrics() {
    const [
      totalHospitals,
      totalProfessionals,
      totalShifts,
      openShifts,
      filledShifts,
      cancelledShifts,
      totalApplications,
    ] = await Promise.all([
      prisma.user.count({ where: { role: UserRole.HOSPITAL } }),
      prisma.user.count({ where: { role: UserRole.PROFESSIONAL } }),
      prisma.shift.count(),
      prisma.shift.count({ where: { status: "OPEN" } }),
      prisma.shift.count({ where: { status: "FILLED" } }),
      prisma.shift.count({ where: { status: "CANCELLED" } }),
      prisma.application.count(),
    ])

    const fillRate =
      totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100 * 100) / 100 : 0

    return {
      totalHospitals,
      totalProfessionals,
      totalShifts,
      openShifts,
      filledShifts,
      cancelledShifts,
      totalApplications,
      fillRate,
    }
  }

  static async listUsers(filters: ListUsersFilters) {
    const { role, status, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          hospitalProfile: {
            select: { id: true, name: true, cnpj: true, city: true, state: true },
          },
          professionalProfile: {
            select: { id: true, name: true, cpf: true, councilType: true, councilNumber: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    return { data, pagination: paginationMeta(total, page, limit) }
  }

  static async getUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        hospitalProfile: true,
        professionalProfile: true,
      },
    })

    if (!user) throw new NotFoundError("Usuário não encontrado")

    return user
  }

  static async updateUserStatus(id: string, status: UserStatus) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundError("Usuário não encontrado")
    if (user.role === UserRole.ADMIN) {
      throw new AppError("Não é possível alterar o status de um administrador", 400, "BAD_REQUEST")
    }

    return prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    })
  }

  static async listShifts(filters: { status?: string; page: number; limit: number }) {
    const { status, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          specialty: true,
          hospital: {
            select: { id: true, name: true, city: true, state: true },
          },
          _count: { select: { applications: true } },
        },
      }),
      prisma.shift.count({ where }),
    ])

    return { data, pagination: paginationMeta(total, page, limit) }
  }
}
