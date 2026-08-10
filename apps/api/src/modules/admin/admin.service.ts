import argon2 from "argon2"
import { UserRole, UserStatus, Prisma } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { NotFoundError, AppError, ConflictError } from "../../shared/errors/AppError"
import { paginate, paginationMeta } from "../../shared/helpers/pagination"
import { geocodeByZipCode } from "../../shared/services/geocoding.service"
import { notify } from "../../shared/services/notification.service"
import {
  AdminCreateHospitalInput,
  AdminCreateProfessionalInput,
  AdminUpdateHospitalInput,
  AdminUpdateProfessionalInput,
} from "./admin.dto"

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
}

function handlePrismaConflict(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = (err.meta?.target as string[]) ?? []
    if (target.includes("email")) throw new ConflictError("Email já cadastrado")
    if (target.includes("cnpj")) throw new ConflictError("CNPJ já cadastrado")
    if (target.includes("cpf")) throw new ConflictError("CPF já cadastrado")
    throw new ConflictError("Registro já cadastrado")
  }
  throw err
}

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
        professionalProfile: {
          include: {
            specialties: { select: { specialtyId: true } },
          },
        },
      },
    })

    if (!user) throw new NotFoundError("Usuário não encontrado")

    return user
  }

  static async updateHospital(userId: string, data: AdminUpdateHospitalInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { hospitalProfile: true },
    })
    if (!user) throw new NotFoundError("Usuário não encontrado")
    if (user.role !== UserRole.HOSPITAL) throw new AppError("Usuário não é um hospital", 400, "BAD_REQUEST")

    try {
      const { email, ...profileData } = data
      return await prisma.user.update({
        where: { id: userId },
        data: {
          ...(email ? { email } : {}),
          hospitalProfile: { update: profileData },
        },
        select: {
          id: true, email: true, role: true, status: true, updatedAt: true,
          hospitalProfile: true,
        },
      })
    } catch (err) {
      handlePrismaConflict(err)
    }
  }

  static async updateProfessional(userId: string, data: AdminUpdateProfessionalInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { professionalProfile: true },
    })
    if (!user) throw new NotFoundError("Usuário não encontrado")
    if (user.role !== UserRole.PROFESSIONAL) throw new AppError("Usuário não é um profissional", 400, "BAD_REQUEST")

    try {
      const { email, specialtyIds, ...profileData } = data

      const specialtiesUpdate = specialtyIds
        ? {
            deleteMany: {},
            create: specialtyIds.map((specialtyId) => ({ specialtyId })),
          }
        : undefined

      return await prisma.user.update({
        where: { id: userId },
        data: {
          ...(email ? { email } : {}),
          professionalProfile: {
            update: {
              ...profileData,
              ...(specialtiesUpdate ? { specialties: specialtiesUpdate } : {}),
            },
          },
        },
        select: {
          id: true, email: true, role: true, status: true, updatedAt: true,
          professionalProfile: {
            include: { specialties: { select: { specialtyId: true } } },
          },
        },
      })
    } catch (err) {
      handlePrismaConflict(err)
    }
  }

  static async updateUserStatus(id: string, status: UserStatus) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundError("Usuário não encontrado")
    if (user.role === UserRole.ADMIN) {
      throw new AppError("Não é possível alterar o status de um administrador", 400, "BAD_REQUEST")
    }

    const updated = await prisma.user.update({
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

    if (status !== user.status && status !== UserStatus.PENDING_VERIFICATION) {
      const isReactivation = status === UserStatus.ACTIVE
      await notify({
        userId: id,
        type: "ACCOUNT_STATUS_CHANGED",
        title: isReactivation ? "Sua conta foi reativada" : "Sua conta foi suspensa",
        message: isReactivation
          ? "Sua conta foi reativada e você já pode acessar a plataforma normalmente."
          : "Sua conta foi suspensa pela administração. Entre em contato com o suporte para mais informações.",
      })
    }

    return updated
  }

  static async deleteUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { hospitalProfile: true, professionalProfile: true },
    })
    if (!user) throw new NotFoundError("Usuário não encontrado")
    if (user.role === UserRole.ADMIN) {
      throw new AppError("Não é possível excluir um administrador", 400, "BAD_REQUEST")
    }

    if (user.hospitalProfile) {
      const shiftCount = await prisma.shift.count({ where: { hospitalId: user.hospitalProfile.id } })
      if (shiftCount > 0) {
        throw new ConflictError(
          "Não é possível excluir um hospital com plantões cadastrados. Desative a conta em vez de excluir."
        )
      }
    }

    if (user.professionalProfile) {
      const applicationCount = await prisma.application.count({
        where: { professionalId: user.professionalProfile.id },
      })
      if (applicationCount > 0) {
        throw new ConflictError(
          "Não é possível excluir um profissional com candidaturas registradas. Desative a conta em vez de excluir."
        )
      }
    }

    await prisma.user.delete({ where: { id } })
  }

  static async createHospital(data: AdminCreateHospitalInput) {
    const passwordHash = await argon2.hash(data.password, ARGON2_OPTIONS)
    try {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: UserRole.HOSPITAL,
          hospitalProfile: {
            create: {
              name: data.name,
              cnpj: data.cnpj,
              phone: data.phone,
              street: data.street,
              number: data.number,
              complement: data.complement,
              neighborhood: data.neighborhood,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
            },
          },
        },
        select: { id: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
      })

      const geo = await geocodeByZipCode(data.zipCode)
      if (geo) {
        await prisma.hospitalProfile.update({
          where: { userId: user.id },
          data: { latitude: geo.latitude, longitude: geo.longitude },
        })
      }

      return user
    } catch (err) {
      handlePrismaConflict(err)
    }
  }

  static async createProfessional(data: AdminCreateProfessionalInput) {
    const passwordHash = await argon2.hash(data.password, ARGON2_OPTIONS)
    try {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: UserRole.PROFESSIONAL,
          professionalProfile: {
            create: {
              name: data.name,
              cpf: data.cpf,
              phone: data.phone,
              councilType: data.councilType,
              councilNumber: data.councilNumber,
              councilState: data.councilState,
              street: data.street,
              number: data.number,
              complement: data.complement,
              neighborhood: data.neighborhood,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
              specialties: {
                create: data.specialtyIds.map((specialtyId) => ({ specialtyId })),
              },
            },
          },
        },
        select: { id: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
      })

      if (data.zipCode) {
        const geo = await geocodeByZipCode(data.zipCode)
        if (geo) {
          await prisma.professionalProfile.update({
            where: { userId: user.id },
            data: { latitude: geo.latitude, longitude: geo.longitude },
          })
        }
      }

      return user
    } catch (err) {
      handlePrismaConflict(err)
    }
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

  static async listSwaps(filters: { status?: string; page: number; limit: number }) {
    const { status, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.shiftSwapRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          shift: {
            include: {
              specialty: true,
              hospital: { select: { id: true, name: true, city: true, state: true } },
            },
          },
          requestingProfessional: {
            select: { id: true, name: true, councilType: true, councilNumber: true },
          },
          interests: {
            include: { professional: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.shiftSwapRequest.count({ where }),
    ])

    return { data, pagination: paginationMeta(total, page, limit) }
  }

  static async listLeaveRequests(filters: { status?: string; page: number; limit: number }) {
    const { status, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          shift: {
            include: {
              specialty: true,
              hospital: { select: { id: true, name: true, city: true, state: true } },
            },
          },
          professional: { select: { id: true, name: true } },
        },
      }),
      prisma.leaveRequest.count({ where }),
    ])

    return { data, pagination: paginationMeta(total, page, limit) }
  }

  static async listStaff(filters: { status?: string; hospitalId?: string; page: number; limit: number }) {
    const { status, hospitalId, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (hospitalId) where.hospitalId = hospitalId

    const [data, total] = await Promise.all([
      prisma.hospitalStaff.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          hospital: { select: { id: true, name: true, city: true, state: true } },
          professional: { select: { id: true, name: true, cpf: true, councilType: true, councilNumber: true } },
        },
      }),
      prisma.hospitalStaff.count({ where }),
    ])

    return { data, pagination: paginationMeta(total, page, limit) }
  }

  /** Plantões OPEN nas próximas 24h ainda sem nenhuma candidatura. */
  static async getRiskShifts() {
    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    return prisma.shift.findMany({
      where: {
        status: "OPEN",
        date: { gte: now, lte: in24h },
        applications: { none: {} },
      },
      orderBy: { date: "asc" },
      include: {
        specialty: true,
        hospital: { select: { id: true, name: true, city: true, state: true } },
      },
      take: 50,
    })
  }

  /** Feed de atividade recente: une os eventos mais recentes de cada domínio, sem um model dedicado de log. */
  static async getRecentActivity(limit = 20) {
    const perSource = Math.min(limit, 30)

    const [shifts, applications, swaps, leaves] = await Promise.all([
      prisma.shift.findMany({
        orderBy: { updatedAt: "desc" },
        take: perSource,
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          hospital: { select: { name: true } },
        },
      }),
      prisma.application.findMany({
        orderBy: { updatedAt: "desc" },
        take: perSource,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          shift: { select: { title: true } },
          professional: { select: { name: true } },
        },
      }),
      prisma.shiftSwapRequest.findMany({
        orderBy: { updatedAt: "desc" },
        take: perSource,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          shift: { select: { title: true } },
          requestingProfessional: { select: { name: true } },
        },
      }),
      prisma.leaveRequest.findMany({
        orderBy: { updatedAt: "desc" },
        take: perSource,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          shift: { select: { title: true } },
          professional: { select: { name: true } },
        },
      }),
    ])

    const events = [
      ...shifts.map((s) => ({
        id: `shift-${s.id}`,
        type: "SHIFT" as const,
        summary: `Plantão "${s.title}" (${s.hospital.name}) — ${s.status}`,
        at: s.updatedAt,
      })),
      ...applications.map((a) => ({
        id: `application-${a.id}`,
        type: "APPLICATION" as const,
        summary: `Candidatura de ${a.professional.name} em "${a.shift.title}" — ${a.status}`,
        at: a.updatedAt,
      })),
      ...swaps.map((s) => ({
        id: `swap-${s.id}`,
        type: "SWAP" as const,
        summary: `Troca de ${s.requestingProfessional.name} em "${s.shift.title}" — ${s.status}`,
        at: s.updatedAt,
      })),
      ...leaves.map((l) => ({
        id: `leave-${l.id}`,
        type: "LEAVE" as const,
        summary: `Folga de ${l.professional.name} em "${l.shift.title}" — ${l.status}`,
        at: l.updatedAt,
      })),
    ]

    events.sort((a, b) => b.at.getTime() - a.at.getTime())

    return events.slice(0, limit)
  }
}
