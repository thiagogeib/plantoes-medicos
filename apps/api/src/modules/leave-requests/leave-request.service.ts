import {
  ApplicationStatus,
  StaffStatus,
  LeaveRequestStatus,
  SwapInterestStatus,
} from "@prisma/client"
import { prisma } from "../../prisma/client"
import { NotFoundError, ForbiddenError, ConflictError } from "../../shared/errors/AppError"
import type { CreateLeaveRequestInput } from "./leave-request.dto"

const leaveInclude = {
  shift: {
    include: {
      specialty: true,
      hospital: { select: { id: true, name: true, city: true, state: true } },
    },
  },
  professional: {
    select: { id: true, name: true, councilType: true, councilNumber: true },
  },
  coverInterests: {
    include: {
      professional: {
        select: { id: true, name: true, councilType: true, councilNumber: true, phone: true },
      },
    },
  },
} as const

export class LeaveRequestService {
  static async create(professionalId: string, input: CreateLeaveRequestInput) {
    const application = await prisma.application.findUnique({
      where: { shiftId_professionalId: { shiftId: input.shiftId, professionalId } },
      include: { shift: true },
    })
    if (!application || application.status !== ApplicationStatus.ACCEPTED) {
      throw new ConflictError("Você só pode solicitar folga de um plantão que já foi aceito")
    }

    const staffLink = await prisma.hospitalStaff.findUnique({
      where: { hospitalId_professionalId: { hospitalId: application.shift.hospitalId, professionalId } },
    })
    if (!staffLink || staffLink.status !== StaffStatus.ACTIVE) {
      throw new ForbiddenError("Você não faz parte do quadro deste hospital")
    }

    const existing = await prisma.leaveRequest.findFirst({
      where: {
        shiftId: input.shiftId,
        professionalId,
        status: { in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED_PENDING_COVERAGE] },
      },
    })
    if (existing) throw new ConflictError("Já existe uma solicitação de folga em aberto para este plantão")

    return prisma.leaveRequest.create({
      data: {
        shiftId: input.shiftId,
        professionalId,
        date: application.shift.date,
        reason: input.reason,
      },
      include: leaveInclude,
    })
  }

  static async listMine(professionalId: string) {
    return prisma.leaveRequest.findMany({
      where: { professionalId },
      orderBy: { createdAt: "desc" },
      include: leaveInclude,
    })
  }

  static async cancel(id: string, professionalId: string) {
    const leave = await prisma.leaveRequest.findUnique({ where: { id } })
    if (!leave) throw new NotFoundError("Solicitação de folga não encontrada")
    if (leave.professionalId !== professionalId) throw new ForbiddenError("Sem permissão para cancelar esta solicitação")
    if (leave.status !== LeaveRequestStatus.PENDING) {
      throw new ConflictError("Apenas solicitações pendentes podem ser canceladas")
    }

    return prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveRequestStatus.CANCELLED },
    })
  }

  static async listForHospital(hospitalId: string) {
    return prisma.leaveRequest.findMany({
      where: { shift: { hospitalId } },
      orderBy: { createdAt: "desc" },
      include: leaveInclude,
    })
  }

  static async approve(id: string, hospitalId: string) {
    const leave = await prisma.leaveRequest.findUnique({ where: { id }, include: { shift: true } })
    if (!leave) throw new NotFoundError("Solicitação de folga não encontrada")
    if (leave.shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão sobre esta solicitação")
    if (leave.status !== LeaveRequestStatus.PENDING) throw new ConflictError("Esta solicitação já foi respondida")

    return prisma.$transaction(async (tx) => {
      const staffLink = await tx.hospitalStaff.findUnique({
        where: { hospitalId_professionalId: { hospitalId, professionalId: leave.professionalId } },
      })
      if (staffLink) {
        await tx.hospitalStaff.update({
          where: { id: staffLink.id },
          data: { availableDaysOff: Math.max(0, staffLink.availableDaysOff - 1) },
        })
      }

      return tx.leaveRequest.update({
        where: { id },
        data: { status: LeaveRequestStatus.APPROVED_PENDING_COVERAGE },
      })
    })
  }

  static async reject(id: string, hospitalId: string) {
    const leave = await prisma.leaveRequest.findUnique({ where: { id }, include: { shift: true } })
    if (!leave) throw new NotFoundError("Solicitação de folga não encontrada")
    if (leave.shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão sobre esta solicitação")
    if (leave.status !== LeaveRequestStatus.PENDING) throw new ConflictError("Esta solicitação já foi respondida")

    return prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveRequestStatus.REJECTED },
    })
  }

  static async listAvailableForProfessional(professionalId: string) {
    const staffLinks = await prisma.hospitalStaff.findMany({
      where: { professionalId, status: StaffStatus.ACTIVE },
      select: { hospitalId: true },
    })
    const hospitalIds = staffLinks.map((s) => s.hospitalId)
    if (hospitalIds.length === 0) return []

    const specialties = await prisma.professionalSpecialty.findMany({
      where: { professionalId },
      select: { specialtyId: true },
    })
    const specialtyIds = specialties.map((s) => s.specialtyId)

    return prisma.leaveRequest.findMany({
      where: {
        status: LeaveRequestStatus.APPROVED_PENDING_COVERAGE,
        professionalId: { not: professionalId },
        shift: {
          hospitalId: { in: hospitalIds },
          specialtyId: { in: specialtyIds },
        },
      },
      orderBy: { createdAt: "desc" },
      include: leaveInclude,
    })
  }

  static async expressInterest(leaveRequestId: string, professionalId: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: { shift: true },
    })
    if (!leave) throw new NotFoundError("Solicitação de folga não encontrada")
    if (leave.status !== LeaveRequestStatus.APPROVED_PENDING_COVERAGE) {
      throw new ConflictError("Esta folga não está disponível para cobertura")
    }
    if (leave.professionalId === professionalId) {
      throw new ConflictError("Você não pode cobrir sua própria folga")
    }

    const staffLink = await prisma.hospitalStaff.findUnique({
      where: { hospitalId_professionalId: { hospitalId: leave.shift.hospitalId, professionalId } },
    })
    if (!staffLink || staffLink.status !== StaffStatus.ACTIVE) {
      throw new ForbiddenError("Você não faz parte do quadro deste hospital")
    }

    const existing = await prisma.leaveCoverInterest.findUnique({
      where: { leaveRequestId_professionalId: { leaveRequestId, professionalId } },
    })
    if (existing) throw new ConflictError("Você já manifestou interesse nesta cobertura")

    return prisma.leaveCoverInterest.create({
      data: { leaveRequestId, professionalId },
    })
  }

  static async selectCover(leaveRequestId: string, hospitalId: string, interestId: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: { shift: true },
    })
    if (!leave) throw new NotFoundError("Solicitação de folga não encontrada")
    if (leave.shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão sobre esta solicitação")
    if (leave.status !== LeaveRequestStatus.APPROVED_PENDING_COVERAGE) {
      throw new ConflictError("Esta folga não está aguardando cobertura")
    }

    const interest = await prisma.leaveCoverInterest.findUnique({ where: { id: interestId } })
    if (!interest || interest.leaveRequestId !== leaveRequestId) {
      throw new NotFoundError("Manifestação de interesse não encontrada")
    }

    return prisma.$transaction(async (tx) => {
      await tx.leaveCoverInterest.updateMany({
        where: { leaveRequestId, id: { not: interestId } },
        data: { status: SwapInterestStatus.REJECTED },
      })
      await tx.leaveCoverInterest.update({
        where: { id: interestId },
        data: { status: SwapInterestStatus.SELECTED },
      })
      const updatedLeave = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: { status: LeaveRequestStatus.COVERED, selectedCoverInterestId: interestId },
      })

      const originalApplication = await tx.application.findUnique({
        where: { shiftId_professionalId: { shiftId: leave.shiftId, professionalId: leave.professionalId } },
      })
      if (originalApplication) {
        await tx.application.update({
          where: { id: originalApplication.id },
          data: { status: ApplicationStatus.WITHDRAWN },
        })
      }

      const coverApplication = await tx.application.findUnique({
        where: { shiftId_professionalId: { shiftId: leave.shiftId, professionalId: interest.professionalId } },
      })
      if (coverApplication) {
        await tx.application.update({
          where: { id: coverApplication.id },
          data: { status: ApplicationStatus.ACCEPTED },
        })
      } else {
        await tx.application.create({
          data: {
            shiftId: leave.shiftId,
            professionalId: interest.professionalId,
            status: ApplicationStatus.ACCEPTED,
          },
        })
      }

      return updatedLeave
    })
  }
}
