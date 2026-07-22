import { StaffStatus } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { NotFoundError, ForbiddenError, ConflictError } from "../../shared/errors/AppError"
import { paginate, paginationMeta } from "../../shared/helpers/pagination"
import type { AdjustBalanceInput, StaffFilters } from "./hospital-staff.dto"

const professionalSelect = {
  id: true,
  name: true,
  cpf: true,
  phone: true,
  councilType: true,
  councilNumber: true,
  councilState: true,
} as const

export class HospitalStaffService {
  static async invite(hospitalId: string, cpf: string) {
    const professional = await prisma.professionalProfile.findUnique({ where: { cpf } })
    if (!professional) throw new NotFoundError("Nenhum profissional encontrado com este CPF")

    const existing = await prisma.hospitalStaff.findUnique({
      where: { hospitalId_professionalId: { hospitalId, professionalId: professional.id } },
    })

    if (existing) {
      if (existing.status === StaffStatus.INACTIVE) {
        return prisma.hospitalStaff.update({
          where: { id: existing.id },
          data: { status: StaffStatus.INVITED, invitedAt: new Date() },
          include: { professional: { select: professionalSelect } },
        })
      }
      throw new ConflictError("Profissional já convidado ou vinculado a este hospital")
    }

    return prisma.hospitalStaff.create({
      data: { hospitalId, professionalId: professional.id },
      include: { professional: { select: professionalSelect } },
    })
  }

  static async listHospitalStaff(hospitalId: string, filters: StaffFilters) {
    const { status, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const where: Record<string, unknown> = { hospitalId }
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.hospitalStaff.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { professional: { select: professionalSelect } },
      }),
      prisma.hospitalStaff.count({ where }),
    ])

    return { data, pagination: paginationMeta(total, page, limit) }
  }

  static async deactivate(id: string, hospitalId: string) {
    const staff = await prisma.hospitalStaff.findUnique({ where: { id } })
    if (!staff) throw new NotFoundError("Vínculo não encontrado")
    if (staff.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão para gerenciar este vínculo")

    return prisma.hospitalStaff.update({
      where: { id },
      data: { status: StaffStatus.INACTIVE },
    })
  }

  static async adjustBalance(id: string, hospitalId: string, input: AdjustBalanceInput) {
    const staff = await prisma.hospitalStaff.findUnique({ where: { id } })
    if (!staff) throw new NotFoundError("Vínculo não encontrado")
    if (staff.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão para gerenciar este vínculo")

    return prisma.hospitalStaff.update({
      where: { id },
      data: {
        ...(input.hourBankMinutes !== undefined ? { hourBankMinutes: input.hourBankMinutes } : {}),
        ...(input.availableDaysOff !== undefined ? { availableDaysOff: input.availableDaysOff } : {}),
      },
    })
  }

  static async listMyLinks(professionalId: string) {
    return prisma.hospitalStaff.findMany({
      where: { professionalId },
      orderBy: { createdAt: "desc" },
      include: {
        hospital: { select: { id: true, name: true, city: true, state: true } },
      },
    })
  }

  static async respondInvite(id: string, professionalId: string, accept: boolean) {
    const staff = await prisma.hospitalStaff.findUnique({ where: { id } })
    if (!staff) throw new NotFoundError("Convite não encontrado")
    if (staff.professionalId !== professionalId) throw new ForbiddenError("Sem permissão para responder este convite")
    if (staff.status !== StaffStatus.INVITED) throw new ConflictError("Este convite já foi respondido")

    return prisma.hospitalStaff.update({
      where: { id },
      data: accept
        ? { status: StaffStatus.ACTIVE, joinedAt: new Date() }
        : { status: StaffStatus.INACTIVE },
    })
  }
}
