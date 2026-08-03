import { LeaveRequestStatus, ApplicationStatus, ShiftStatus, Prisma } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { notify } from "../../shared/services/notification.service"

type Tx = Prisma.TransactionClient

/**
 * Cancela a LeaveRequest vinculada a uma Shift (se houver) e estorna o banco de horas
 * do profissional. Usado quando o hospital cancela/edita a Shift de cobertura, ou
 * quando a folga expira sem candidato. Deve ser chamado dentro de uma transação.
 */
export async function refundLeaveRequestForShift(
  tx: Tx,
  shiftId: string,
  hospitalId: string
): Promise<void> {
  const leave = await tx.leaveRequest.findUnique({ where: { shiftId } })
  if (!leave) return
  if (
    leave.status !== LeaveRequestStatus.PENDING &&
    leave.status !== LeaveRequestStatus.APPROVED_PENDING_COVERAGE &&
    leave.status !== LeaveRequestStatus.CANCELLATION_REQUESTED
  ) {
    return
  }

  await tx.leaveRequest.update({
    where: { id: leave.id },
    data: { status: LeaveRequestStatus.CANCELLED },
  })

  const staffLink = await tx.hospitalStaff.findUnique({
    where: { hospitalId_professionalId: { hospitalId, professionalId: leave.professionalId } },
  })
  if (staffLink) {
    await tx.hospitalStaff.update({
      where: { id: staffLink.id },
      data: { hourBankMinutes: staffLink.hourBankMinutes + leave.durationMinutes },
    })
  }
}

interface ExpirationFilter {
  hospitalId?: string
  professionalId?: string
  shiftId?: string
}

/**
 * Checagem "lazy" de expiração: cancela folgas em APPROVED_PENDING_COVERAGE cujo prazo
 * (configurável por hospital) já passou e que ainda não têm nenhum candidato reservado/confirmado.
 * Chamado a cada leitura relevante (lista de folgas do profissional/hospital, candidatura a um shift).
 */
export async function expireOverdueLeaveRequests(filter: ExpirationFilter): Promise<void> {
  const candidates = await prisma.leaveRequest.findMany({
    where: {
      status: LeaveRequestStatus.APPROVED_PENDING_COVERAGE,
      ...(filter.shiftId ? { shiftId: filter.shiftId } : {}),
      ...(filter.professionalId ? { professionalId: filter.professionalId } : {}),
      ...(filter.hospitalId ? { shift: { hospitalId: filter.hospitalId } } : {}),
    },
    include: {
      shift: { select: { id: true, hospitalId: true, title: true } },
      professional: { select: { userId: true } },
    },
  })
  if (candidates.length === 0) return

  const hospitalIds = [...new Set(candidates.map((c) => c.shift.hospitalId))]
  const hospitals = await prisma.hospitalProfile.findMany({
    where: { id: { in: hospitalIds } },
    select: { id: true, leaveCoverageDeadlineDays: true },
  })
  const deadlineDaysByHospital = new Map(hospitals.map((h) => [h.id, h.leaveCoverageDeadlineDays]))

  const now = Date.now()

  for (const leave of candidates) {
    const deadlineDays = deadlineDaysByHospital.get(leave.shift.hospitalId) ?? 3
    const deadlineMs = deadlineDays * 24 * 60 * 60 * 1000
    if (now - leave.createdAt.getTime() < deadlineMs) continue

    const hasCommitted = await prisma.application.findFirst({
      where: {
        shiftId: leave.shiftId,
        status: { in: [ApplicationStatus.PENDING_CONFIRMATION, ApplicationStatus.ACCEPTED] },
      },
    })
    if (hasCommitted) continue

    await prisma.$transaction(async (tx) => {
      await tx.application.updateMany({
        where: { shiftId: leave.shiftId, status: ApplicationStatus.PENDING },
        data: { status: ApplicationStatus.REJECTED, rejectionReason: "Prazo de cobertura da folga expirou" },
      })
      await tx.shift.update({ where: { id: leave.shiftId }, data: { status: ShiftStatus.CANCELLED } })
      await refundLeaveRequestForShift(tx, leave.shiftId, leave.shift.hospitalId)
    })

    await notify({
      userId: leave.professional.userId,
      type: "LEAVE_REQUEST_EXPIRED",
      title: "Folga expirou sem cobertura",
      message: `Sua folga em "${leave.shift.title}" expirou sem candidato e foi cancelada. O banco de horas foi estornado.`,
      link: "/profissional/folgas",
    })
  }
}
