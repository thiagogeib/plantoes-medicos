import { StaffStatus } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { ForbiddenError } from "../../shared/errors/AppError"
import type { CreateAbsenceInput, CreateAbsenceForStaffInput } from "./absence.dto"

const absenceInclude = {
  professional: { select: { id: true, name: true, councilType: true, councilNumber: true } },
  hospital: { select: { id: true, name: true } },
} as const

export class AbsenceService {
  static async createByProfessional(professionalId: string, input: CreateAbsenceInput) {
    const staffLink = await prisma.hospitalStaff.findUnique({
      where: { hospitalId_professionalId: { hospitalId: input.hospitalId, professionalId } },
    })
    if (!staffLink || staffLink.status !== StaffStatus.ACTIVE) {
      throw new ForbiddenError("Você não faz parte do quadro deste hospital")
    }

    return prisma.absence.create({
      data: {
        hospitalId: input.hospitalId,
        professionalId,
        type: input.type,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        note: input.note,
      },
      include: absenceInclude,
    })
  }

  static async createByHospital(hospitalId: string, input: CreateAbsenceForStaffInput) {
    const staffLink = await prisma.hospitalStaff.findUnique({
      where: { hospitalId_professionalId: { hospitalId, professionalId: input.professionalId } },
    })
    if (!staffLink) throw new ForbiddenError("Profissional não pertence ao quadro deste hospital")

    return prisma.absence.create({
      data: {
        hospitalId,
        professionalId: input.professionalId,
        type: input.type,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        note: input.note,
      },
      include: absenceInclude,
    })
  }

  static async listMine(professionalId: string) {
    return prisma.absence.findMany({
      where: { professionalId },
      orderBy: { startDate: "desc" },
      include: absenceInclude,
    })
  }

  static async listForHospital(hospitalId: string) {
    return prisma.absence.findMany({
      where: { hospitalId },
      orderBy: { startDate: "desc" },
      include: absenceInclude,
    })
  }
}
