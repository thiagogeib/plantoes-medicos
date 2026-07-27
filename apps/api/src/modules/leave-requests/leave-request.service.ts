import {
  ApplicationStatus,
  StaffStatus,
  StaffType,
  LeaveRequestStatus,
  SwapInterestStatus,
} from "@prisma/client"
import { prisma } from "../../prisma/client"
import { NotFoundError, ForbiddenError, ConflictError } from "../../shared/errors/AppError"
import { notify } from "../../shared/services/notification.service"
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
    if (staffLink.type !== StaffType.FIXO) {
      throw new ForbiddenError(
        "Solicitação de folga é exclusiva para profissionais fixos do quadro. Como plantonista avulso, você pode oferecer este plantão para troca."
      )
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

  static async requestCancellation(id: string, professionalId: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { shift: { include: { hospital: { select: { userId: true } } } } },
    })
    if (!leave) throw new NotFoundError("Solicitação de folga não encontrada")
    if (leave.professionalId !== professionalId) throw new ForbiddenError("Sem permissão para esta solicitação")
    if (leave.status !== LeaveRequestStatus.APPROVED_PENDING_COVERAGE) {
      throw new ConflictError(
        "Só é possível pedir cancelamento de uma folga já aprovada e ainda sem cobertura confirmada"
      )
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveRequestStatus.CANCELLATION_REQUESTED },
    })

    await notify({
      userId: leave.shift.hospital.userId,
      type: "LEAVE_CANCELLATION_REQUESTED",
      title: "Cancelamento de folga solicitado",
      message: `Um profissional pediu para cancelar a folga aprovada em "${leave.shift.title}"`,
      link: `/hospital/folgas`,
    })

    return updated
  }

  static async decideCancellation(id: string, hospitalId: string, approve: boolean) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { shift: true, professional: { select: { userId: true } } },
    })
    if (!leave) throw new NotFoundError("Solicitação de folga não encontrada")
    if (leave.shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão sobre esta solicitação")
    if (leave.status !== LeaveRequestStatus.CANCELLATION_REQUESTED) {
      throw new ConflictError("Não há pedido de cancelamento pendente para esta folga")
    }

    if (!approve) {
      const reverted = await prisma.leaveRequest.update({
        where: { id },
        data: { status: LeaveRequestStatus.APPROVED_PENDING_COVERAGE },
      })
      await notify({
        userId: leave.professional.userId,
        type: "LEAVE_CANCELLATION_DECIDED",
        title: "Cancelamento de folga recusado",
        message: `O hospital recusou o cancelamento — sua folga em "${leave.shift.title}" continua valendo`,
        link: `/profissional/folgas`,
      })
      return reverted
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.leaveCoverInterest.updateMany({
        where: { leaveRequestId: id, status: SwapInterestStatus.PENDING },
        data: { status: SwapInterestStatus.REJECTED },
      })

      const staffLink = await tx.hospitalStaff.findUnique({
        where: { hospitalId_professionalId: { hospitalId, professionalId: leave.professionalId } },
      })
      if (staffLink) {
        await tx.hospitalStaff.update({
          where: { id: staffLink.id },
          data: { availableDaysOff: staffLink.availableDaysOff + 1 },
        })
      }

      return tx.leaveRequest.update({
        where: { id },
        data: { status: LeaveRequestStatus.CANCELLED },
      })
    })

    await notify({
      userId: leave.professional.userId,
      type: "LEAVE_CANCELLATION_DECIDED",
      title: "Cancelamento de folga aprovado",
      message: `Seu pedido de cancelamento da folga em "${leave.shift.title}" foi aprovado`,
      link: `/profissional/folgas`,
    })

    return result
  }

  static async listForHospital(hospitalId: string) {
    return prisma.leaveRequest.findMany({
      where: { shift: { hospitalId } },
      orderBy: { createdAt: "desc" },
      include: leaveInclude,
    })
  }

  static async approve(id: string, hospitalId: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { shift: true, professional: { select: { userId: true } } },
    })
    if (!leave) throw new NotFoundError("Solicitação de folga não encontrada")
    if (leave.shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão sobre esta solicitação")
    if (leave.status !== LeaveRequestStatus.PENDING) throw new ConflictError("Esta solicitação já foi respondida")

    const updated = await prisma.$transaction(async (tx) => {
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

    await notify({
      userId: leave.professional.userId,
      type: "LEAVE_APPROVED",
      title: "Folga aprovada",
      message: `Sua folga em "${leave.shift.title}" foi aprovada e está aberta para cobertura`,
      link: `/profissional/folgas`,
    })

    return updated
  }

  static async reject(id: string, hospitalId: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { shift: true, professional: { select: { userId: true } } },
    })
    if (!leave) throw new NotFoundError("Solicitação de folga não encontrada")
    if (leave.shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão sobre esta solicitação")
    if (leave.status !== LeaveRequestStatus.PENDING) throw new ConflictError("Esta solicitação já foi respondida")

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveRequestStatus.REJECTED },
    })

    await notify({
      userId: leave.professional.userId,
      type: "LEAVE_REJECTED",
      title: "Folga recusada",
      message: `Sua solicitação de folga em "${leave.shift.title}" foi recusada`,
      link: `/profissional/folgas`,
    })

    return updated
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
      include: { shift: true, professional: { select: { userId: true } } },
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

    const created = await prisma.leaveCoverInterest.create({
      data: { leaveRequestId, professionalId },
    })

    await notify({
      userId: leave.professional.userId,
      type: "LEAVE_COVER_INTEREST",
      title: "Novo interesse em cobrir sua folga",
      message: `Um profissional manifestou interesse em cobrir sua folga em "${leave.shift.title}"`,
      link: `/profissional/folgas`,
    })

    return created
  }

  static async selectCover(leaveRequestId: string, hospitalId: string, interestId: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: { shift: true, professional: { select: { userId: true } } },
    })
    if (!leave) throw new NotFoundError("Solicitação de folga não encontrada")
    if (leave.shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão sobre esta solicitação")
    if (leave.status !== LeaveRequestStatus.APPROVED_PENDING_COVERAGE) {
      throw new ConflictError("Esta folga não está aguardando cobertura")
    }

    const interest = await prisma.leaveCoverInterest.findUnique({
      where: { id: interestId },
      include: { professional: { select: { userId: true } } },
    })
    if (!interest || interest.leaveRequestId !== leaveRequestId) {
      throw new NotFoundError("Manifestação de interesse não encontrada")
    }

    const result = await prisma.$transaction(async (tx) => {
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

    await notify({
      userId: interest.professional.userId,
      type: "LEAVE_COVERED",
      title: "Cobertura confirmada",
      message: `Você foi confirmado para cobrir o plantão "${leave.shift.title}"`,
      link: `/profissional/candidaturas`,
    })
    await notify({
      userId: leave.professional.userId,
      type: "LEAVE_COVERED",
      title: "Folga efetivada",
      message: `Sua folga em "${leave.shift.title}" foi efetivada — substituto confirmado`,
      link: `/profissional/folgas`,
    })

    return result
  }
}
