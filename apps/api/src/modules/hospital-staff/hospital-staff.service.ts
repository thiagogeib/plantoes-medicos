import { StaffStatus, StaffType } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { NotFoundError, ForbiddenError, ConflictError } from "../../shared/errors/AppError"
import { paginate, paginationMeta } from "../../shared/helpers/pagination"
import { notify } from "../../shared/services/notification.service"
import type { AdjustBalanceInput, CandidateFilters, StaffFilters, UpdateStaffTypeInput } from "./hospital-staff.dto"

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
  static async invite(hospitalId: string, cpf: string, type?: StaffType) {
    const professional = await prisma.professionalProfile.findUnique({ where: { cpf } })
    if (!professional) throw new NotFoundError("Nenhum profissional encontrado com este CPF")

    const hospital = await prisma.hospitalProfile.findUnique({
      where: { id: hospitalId },
      select: { name: true },
    })

    const existing = await prisma.hospitalStaff.findUnique({
      where: { hospitalId_professionalId: { hospitalId, professionalId: professional.id } },
    })

    let result
    if (existing) {
      if (existing.status === StaffStatus.INACTIVE) {
        result = await prisma.hospitalStaff.update({
          where: { id: existing.id },
          data: { status: StaffStatus.INVITED, invitedAt: new Date(), type: type ?? existing.type },
          include: { professional: { select: professionalSelect } },
        })
      } else {
        throw new ConflictError("Profissional já convidado ou vinculado a este hospital")
      }
    } else {
      result = await prisma.hospitalStaff.create({
        data: { hospitalId, professionalId: professional.id, type: type ?? StaffType.FIXO },
        include: { professional: { select: professionalSelect } },
      })
    }

    await notify({
      userId: professional.userId,
      type: "STAFF_INVITED",
      title: "Convite de hospital",
      message: `${hospital?.name ?? "Um hospital"} convidou você para fazer parte da equipe`,
      link: "/profissional/hospitais",
    })

    return result
  }

  static async updateType(id: string, hospitalId: string, input: UpdateStaffTypeInput) {
    const staff = await prisma.hospitalStaff.findUnique({ where: { id } })
    if (!staff) throw new NotFoundError("Vínculo não encontrado")
    if (staff.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão para gerenciar este vínculo")

    return prisma.hospitalStaff.update({
      where: { id },
      data: { type: input.type },
      include: { professional: { select: professionalSelect } },
    })
  }

  static async listHospitalStaff(hospitalId: string, filters: StaffFilters) {
    const { status, search, councilType, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const where: Record<string, unknown> = { hospitalId }
    if (status) where.status = status
    if (search) where.professional = { name: { contains: search, mode: "insensitive" } }
    if (councilType) where.professional = { ...(where.professional as object), councilType }

    const [data, total] = await Promise.all([
      prisma.hospitalStaff.findMany({
        where,
        skip,
        take,
        orderBy: { professional: { name: "asc" } },
        include: { professional: { select: professionalSelect } },
      }),
      prisma.hospitalStaff.count({ where }),
    ])

    return { data, pagination: paginationMeta(total, page, limit) }
  }

  static async deactivate(id: string, hospitalId: string) {
    const staff = await prisma.hospitalStaff.findUnique({
      where: { id },
      include: {
        professional: { select: { userId: true } },
        hospital: { select: { name: true } },
      },
    })
    if (!staff) throw new NotFoundError("Vínculo não encontrado")
    if (staff.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão para gerenciar este vínculo")

    const result = await prisma.hospitalStaff.update({
      where: { id },
      data: { status: StaffStatus.INACTIVE },
    })

    await notify({
      userId: staff.professional.userId,
      type: "STAFF_REMOVED",
      title: "Removido da equipe",
      message: `Você foi removido da equipe de ${staff.hospital.name}`,
      link: "/profissional/hospitais",
    })

    return result
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

  static async listCandidates(hospitalId: string, filters: CandidateFilters) {
    const { specialtyId, city, search, page, limit } = filters
    const { skip, take } = paginate(page, limit)

    const existingLinks = await prisma.hospitalStaff.findMany({
      where: { hospitalId },
      select: { professionalId: true },
    })
    const excludeIds = existingLinks.map((l) => l.professionalId)

    const where: Record<string, unknown> = { id: { notIn: excludeIds } }
    if (specialtyId) where.specialties = { some: { specialtyId } }
    if (city) where.city = { contains: city, mode: "insensitive" }
    if (search) where.name = { contains: search, mode: "insensitive" }

    const [data, total] = await Promise.all([
      prisma.professionalProfile.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          cpf: true,
          councilType: true,
          councilNumber: true,
          councilState: true,
          city: true,
          state: true,
          specialties: { include: { specialty: true } },
        },
      }),
      prisma.professionalProfile.count({ where }),
    ])

    return { data, pagination: paginationMeta(total, page, limit) }
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
