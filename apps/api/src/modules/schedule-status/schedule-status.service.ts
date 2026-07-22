import { SwapRequestStatus, LeaveRequestStatus } from "@prisma/client"
import { prisma } from "../../prisma/client"

export class ScheduleStatusService {
  static async getDailyStatus(hospitalId: string, date: string) {
    const targetDate = new Date(date)

    const [shifts, swaps, leaves, absences] = await Promise.all([
      prisma.shift.findMany({
        where: { hospitalId, date: targetDate },
        include: { specialty: true },
        orderBy: { startTime: "asc" },
      }),
      prisma.shiftSwapRequest.findMany({
        where: {
          status: SwapRequestStatus.APPROVED,
          shift: { hospitalId, date: targetDate },
        },
        include: {
          shift: { select: { id: true, title: true, startTime: true, endTime: true } },
          requestingProfessional: { select: { id: true, name: true } },
          interests: {
            where: { status: "SELECTED" },
            include: { professional: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: { in: [LeaveRequestStatus.APPROVED_PENDING_COVERAGE, LeaveRequestStatus.COVERED] },
          shift: { hospitalId, date: targetDate },
        },
        include: {
          shift: { select: { id: true, title: true, startTime: true, endTime: true } },
          professional: { select: { id: true, name: true } },
          coverInterests: {
            where: { status: "SELECTED" },
            include: { professional: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.absence.findMany({
        where: {
          hospitalId,
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
        include: { professional: { select: { id: true, name: true } } },
      }),
    ])

    return {
      date,
      shifts,
      swaps: swaps.map((s) => ({
        id: s.id,
        shift: s.shift,
        from: s.requestingProfessional,
        to: s.interests[0]?.professional ?? null,
      })),
      leaves: leaves.map((l) => ({
        id: l.id,
        shift: l.shift,
        professional: l.professional,
        status: l.status,
        covered: l.status === LeaveRequestStatus.COVERED,
        coveredBy: l.coverInterests[0]?.professional ?? null,
      })),
      absences,
    }
  }
}
