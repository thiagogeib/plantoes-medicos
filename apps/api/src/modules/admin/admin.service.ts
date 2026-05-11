import argon2 from "argon2"
import { UserRole, UserStatus, Prisma } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { NotFoundError, AppError, ConflictError } from "../../shared/errors/AppError"
import { paginate, paginationMeta } from "../../shared/helpers/pagination"
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

  static async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundError("Usuário não encontrado")
    if (user.role === UserRole.ADMIN) {
      throw new AppError("Não é possível excluir um administrador", 400, "BAD_REQUEST")
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
              specialties: {
                create: data.specialtyIds.map((specialtyId) => ({ specialtyId })),
              },
            },
          },
        },
        select: { id: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
      })
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
}
