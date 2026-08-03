import { SwapRequestStatus, LeaveRequestStatus } from "@prisma/client"
import { prisma } from "../../prisma/client"

export class ScheduleStatusService {
  static async getDailyStatus(hospitalId: string, date: string) {
    const targetDate = new Date(date)

    const [shifts, swaps, leaves, absences, extraShifts] = await Promise.all([
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
          status: {
            in: [
              LeaveRequestStatus.APPROVED_PENDING_COVERAGE,
              LeaveRequestStatus.CANCELLATION_REQUESTED,
              LeaveRequestStatus.COVERED,
            ],
          },
          shift: { hospitalId, date: targetDate },
        },
        include: {
          shift: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              applications: {
                where: { status: "ACCEPTED" },
                include: { professional: { select: { id: true, name: true } } },
              },
            },
          },
          professional: { select: { id: true, name: true } },
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
      prisma.shift.findMany({
        where: { hospitalId, date: targetDate, coverageForAbsenceId: { not: null } },
        include: {
          specialty: true,
          coverageForAbsence: {
            include: { professional: { select: { id: true, name: true } } },
          },
        },
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
      leaves: leaves.map((l) => {
        const { applications, ...shift } = l.shift
        return {
          id: l.id,
          shift,
          professional: l.professional,
          status: l.status,
          covered: l.status === LeaveRequestStatus.COVERED,
          coveredBy: applications[0]?.professional ?? null,
        }
      }),
      absences,
      extraShifts: extraShifts.map((s) => ({
        id: s.id,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        specialty: s.specialty,
        coveringAbsence: s.coverageForAbsence
          ? {
              id: s.coverageForAbsence.id,
              type: s.coverageForAbsence.type,
              professional: s.coverageForAbsence.professional,
            }
          : null,
      })),
    }
  }
}
