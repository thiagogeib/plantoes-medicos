import {
  StaffStatus,
  StaffType,
  LeaveRequestStatus,
  ShiftStatus,
  CompensationType,
  ApplicationStatus,
} from "@prisma/client"
import { prisma } from "../../prisma/client"
import { NotFoundError, ForbiddenError, ConflictError } from "../../shared/errors/AppError"
import { notify } from "../../shared/services/notification.service"
import { computeShiftDurationMinutes } from "../../shared/helpers/duration"
import { notifyProfessionalsAboutNewShift } from "../../shared/services/shift-notification.service"
import { refundLeaveRequestForShift, expireOverdueLeaveRequests } from "./leave-request-expiration.service"
import type { CreateLeaveRequestInput } from "./leave-request.dto"

const leaveInclude = {
  shift: {
    include: {
      specialty: true,
      hospital: {
        select: { id: true, name: true, city: true, state: true, leaveCoverageDeadlineDays: true, longLeaveThresholdMinutes: true },
      },
      applications: {
        where: {
          status: {
            in: [ApplicationStatus.PENDING, ApplicationStatus.PENDING_CONFIRMATION, ApplicationStatus.ACCEPTED],
          },
        },
        include: {
          professional: { select: { id: true, name: true, councilType: true, councilNumber: true } },
        },
      },
    },
  },
  professional: {
    select: { id: true, name: true, councilType: true, councilNumber: true },
  },
}

export class LeaveRequestService {
  static async create(professionalId: string, input: CreateLeaveRequestInput) {
    const professional = await prisma.professionalProfile.findUnique({
      where: { id: professionalId },
      select: {
        id: true,
        name: true,
        councilType: true,
        specialties: { select: { specialtyId: true } },
      },
    })
    if (!professional) throw new NotFoundError("Perfil profissional não encontrado")

    const hasSpecialty = professional.specialties.some((s) => s.specialtyId === input.specialtyId)
    if (!hasSpecialty) throw new ForbiddenError("Selecione uma área de atuação do seu próprio perfil")

    const specialty = await prisma.specialty.findUnique({ where: { id: input.specialtyId } })
    if (!specialty) throw new NotFoundError("Especialidade não encontrada")

    const staffLinks = await prisma.hospitalStaff.findMany({
      where: { professionalId, status: StaffStatus.ACTIVE, type: StaffType.FIXO },
      include: {
        hospital: {
          select: { id: true, name: true, street: true, number: true, city: true, state: true, userId: true },
        },
      },
    })
    if (staffLinks.length === 0) {
      throw new ForbiddenError(
        "Solicitação de folga é exclusiva para profissionais fixos ativos do quadro de algum hospital"
      )
    }

    let staffLink = staffLinks[0]
    if (staffLinks.length > 1) {
      if (!input.hospitalId) {
        throw new ConflictError("Você é fixo em mais de um hospital — informe hospitalId")
      }
      const match = staffLinks.find((s) => s.hospitalId === input.hospitalId)
      if (!match) throw new ForbiddenError("Você não é fixo ativo neste hospital")
      staffLink = match
    } else if (input.hospitalId && input.hospitalId !== staffLink.hospitalId) {
      throw new ForbiddenError("Você não é fixo ativo neste hospital")
    }

    const durationMinutes = computeShiftDurationMinutes(input.startTime, input.endTime)
    if (staffLink.hourBankMinutes < durationMinutes) {
      throw new ConflictError("Saldo de banco de horas insuficiente para a duração solicitada")
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.hospitalStaff.update({
        where: { id: staffLink.id },
        data: { hourBankMinutes: { decrement: durationMinutes } },
      })

      const shift = await tx.shift.create({
        data: {
          hospitalId: staffLink.hospitalId,
          specialtyId: input.specialtyId,
          requiredCouncilType: professional.councilType,
          title: `Cobertura de folga — ${professional.name}`,
          description: input.reason
            ? `Cobertura de folga solicitada por ${professional.name}. Motivo: ${input.reason}`
            : `Cobertura de folga solicitada por ${professional.name}.`,
          date: new Date(input.date),
          startTime: input.startTime,
          endTime: input.endTime,
          location: `${staffLink.hospital.street}, ${staffLink.hospital.number} - ${staffLink.hospital.city}/${staffLink.hospital.state}`,
          slots: 1,
          status: ShiftStatus.OPEN,
          compensationType: CompensationType.MONEY,
        },
        include: { specialty: true, hospital: { select: { name: true, city: true, state: true } } },
      })

      const leave = await tx.leaveRequest.create({
        data: {
          shiftId: shift.id,
          professionalId,
          date: new Date(input.date),
          durationMinutes,
          reason: input.reason,
          status: LeaveRequestStatus.APPROVED_PENDING_COVERAGE,
        },
        include: leaveInclude,
      })

      return { leave, shift, hospitalUserId: staffLink.hospital.userId }
    })

    void notifyProfessionalsAboutNewShift(result.shift)
    await notify({
      userId: result.hospitalUserId,
      type: "LEAVE_REQUEST_OPENED",
      title: "Vaga de cobertura de folga aberta",
      message: `Uma vaga de cobertura foi aberta automaticamente para a folga de ${professional.name}`,
      link: `/hospital/folgas`,
    })

    return result.leave
  }

  static async listMine(professionalId: string) {
    try {
      await expireOverdueLeaveRequests({ professionalId })
    } catch (err) {
      console.error("[listMine] Falha ao expirar leave requests vencidas:", err)
    }
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
        "Só é possível pedir cancelamento de uma folga já aberta e ainda sem cobertura confirmada"
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
      message: `Um profissional pediu para cancelar a folga aberta em "${leave.shift.title}"`,
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
      await tx.application.updateMany({
        where: { shiftId: leave.shiftId, status: "PENDING" },
        data: { status: "REJECTED", rejectionReason: "Folga cancelada pelo profissional" },
      })
      await tx.shift.update({ where: { id: leave.shiftId }, data: { status: ShiftStatus.CANCELLED } })
      await refundLeaveRequestForShift(tx, leave.shiftId, hospitalId)
      return tx.leaveRequest.findUnique({ where: { id } })
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
    try {
      await expireOverdueLeaveRequests({ hospitalId })
    } catch (err) {
      console.error("[listForHospital] Falha ao expirar leave requests vencidas:", err)
    }
    return prisma.leaveRequest.findMany({
      where: { shift: { hospitalId } },
      orderBy: { createdAt: "desc" },
      include: leaveInclude,
    })
  }
}
