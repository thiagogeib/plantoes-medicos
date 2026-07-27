import { ApplicationStatus, StaffStatus, SwapRequestStatus, SwapInterestStatus } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { NotFoundError, ForbiddenError, ConflictError } from "../../shared/errors/AppError"
import { notify } from "../../shared/services/notification.service"
import type { CreateSwapRequestInput } from "./shift-swap.dto"

const shiftInclude = {
  shift: {
    include: {
      specialty: true,
      hospital: { select: { id: true, name: true, city: true, state: true } },
    },
  },
  requestingProfessional: {
    select: { id: true, name: true, councilType: true, councilNumber: true },
  },
  interests: {
    include: {
      professional: {
        select: { id: true, name: true, councilType: true, councilNumber: true, phone: true },
      },
    },
  },
} as const

export class ShiftSwapService {
  static async createSwapRequest(professionalId: string, input: CreateSwapRequestInput) {
    const application = await prisma.application.findUnique({
      where: { shiftId_professionalId: { shiftId: input.shiftId, professionalId } },
      include: { shift: true },
    })
    if (!application || application.status !== ApplicationStatus.ACCEPTED) {
      throw new ConflictError("Você só pode oferecer para troca um plantão que já foi aceito")
    }

    const staffLink = await prisma.hospitalStaff.findUnique({
      where: {
        hospitalId_professionalId: {
          hospitalId: application.shift.hospitalId,
          professionalId,
        },
      },
    })
    if (!staffLink || staffLink.status !== StaffStatus.ACTIVE) {
      throw new ForbiddenError("Você não faz parte do quadro deste hospital")
    }

    const existingOpen = await prisma.shiftSwapRequest.findFirst({
      where: { shiftId: input.shiftId, status: SwapRequestStatus.OPEN },
    })
    if (existingOpen) throw new ConflictError("Já existe uma solicitação de troca aberta para este plantão")

    return prisma.shiftSwapRequest.create({
      data: {
        shiftId: input.shiftId,
        requestingProfessionalId: professionalId,
        reason: input.reason,
      },
      include: shiftInclude,
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

    return prisma.shiftSwapRequest.findMany({
      where: {
        status: SwapRequestStatus.OPEN,
        requestingProfessionalId: { not: professionalId },
        shift: {
          hospitalId: { in: hospitalIds },
          specialtyId: { in: specialtyIds },
        },
      },
      orderBy: { createdAt: "desc" },
      include: shiftInclude,
    })
  }

  static async listMyRequests(professionalId: string) {
    return prisma.shiftSwapRequest.findMany({
      where: { requestingProfessionalId: professionalId },
      orderBy: { createdAt: "desc" },
      include: shiftInclude,
    })
  }

  static async expressInterest(swapRequestId: string, professionalId: string) {
    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id: swapRequestId },
      include: { shift: true, requestingProfessional: { select: { userId: true } } },
    })
    if (!swap) throw new NotFoundError("Solicitação de troca não encontrada")
    if (swap.status !== SwapRequestStatus.OPEN) throw new ConflictError("Esta solicitação não está mais aberta")
    if (swap.requestingProfessionalId === professionalId) {
      throw new ConflictError("Você não pode manifestar interesse na própria solicitação")
    }

    const staffLink = await prisma.hospitalStaff.findUnique({
      where: { hospitalId_professionalId: { hospitalId: swap.shift.hospitalId, professionalId } },
    })
    if (!staffLink || staffLink.status !== StaffStatus.ACTIVE) {
      throw new ForbiddenError("Você não faz parte do quadro deste hospital")
    }

    const existing = await prisma.shiftSwapInterest.findUnique({
      where: { swapRequestId_professionalId: { swapRequestId, professionalId } },
    })
    if (existing) throw new ConflictError("Você já manifestou interesse nesta troca")

    const created = await prisma.shiftSwapInterest.create({
      data: { swapRequestId, professionalId },
    })

    await notify({
      userId: swap.requestingProfessional.userId,
      type: "SWAP_INTEREST",
      title: "Novo interesse na sua troca",
      message: `Um profissional manifestou interesse em cobrir "${swap.shift.title}"`,
      link: `/profissional/trocas`,
    })

    return created
  }

  static async cancel(swapRequestId: string, professionalId: string) {
    const swap = await prisma.shiftSwapRequest.findUnique({ where: { id: swapRequestId } })
    if (!swap) throw new NotFoundError("Solicitação de troca não encontrada")
    if (swap.requestingProfessionalId !== professionalId) {
      throw new ForbiddenError("Sem permissão para cancelar esta solicitação")
    }
    if (swap.status !== SwapRequestStatus.OPEN) {
      throw new ConflictError("Apenas solicitações abertas podem ser canceladas")
    }

    return prisma.shiftSwapRequest.update({
      where: { id: swapRequestId },
      data: { status: SwapRequestStatus.CANCELLED },
    })
  }

  static async listForHospital(hospitalId: string) {
    return prisma.shiftSwapRequest.findMany({
      where: { shift: { hospitalId } },
      orderBy: { createdAt: "desc" },
      include: shiftInclude,
    })
  }

  static async approve(swapRequestId: string, hospitalId: string, interestId: string) {
    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id: swapRequestId },
      include: { shift: true, requestingProfessional: { select: { userId: true } } },
    })
    if (!swap) throw new NotFoundError("Solicitação de troca não encontrada")
    if (swap.shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão sobre esta solicitação")
    if (swap.status !== SwapRequestStatus.OPEN) throw new ConflictError("Esta solicitação não está mais aberta")

    const interest = await prisma.shiftSwapInterest.findUnique({
      where: { id: interestId },
      include: { professional: { select: { userId: true } } },
    })
    if (!interest || interest.swapRequestId !== swapRequestId) {
      throw new NotFoundError("Manifestação de interesse não encontrada")
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.shiftSwapInterest.updateMany({
        where: { swapRequestId, id: { not: interestId } },
        data: { status: SwapInterestStatus.REJECTED },
      })
      await tx.shiftSwapInterest.update({
        where: { id: interestId },
        data: { status: SwapInterestStatus.SELECTED },
      })
      const updatedSwap = await tx.shiftSwapRequest.update({
        where: { id: swapRequestId },
        data: { status: SwapRequestStatus.APPROVED, selectedInterestId: interestId },
      })

      const oldApplication = await tx.application.findUnique({
        where: {
          shiftId_professionalId: { shiftId: swap.shiftId, professionalId: swap.requestingProfessionalId },
        },
      })
      if (oldApplication) {
        await tx.application.update({
          where: { id: oldApplication.id },
          data: { status: ApplicationStatus.WITHDRAWN },
        })
      }

      const newApplication = await tx.application.findUnique({
        where: { shiftId_professionalId: { shiftId: swap.shiftId, professionalId: interest.professionalId } },
      })
      if (newApplication) {
        await tx.application.update({
          where: { id: newApplication.id },
          data: { status: ApplicationStatus.ACCEPTED },
        })
      } else {
        await tx.application.create({
          data: {
            shiftId: swap.shiftId,
            professionalId: interest.professionalId,
            status: ApplicationStatus.ACCEPTED,
          },
        })
      }

      return updatedSwap
    })

    await notify({
      userId: interest.professional.userId,
      type: "SWAP_APPROVED",
      title: "Troca aprovada",
      message: `Você foi confirmado para cobrir "${swap.shift.title}"`,
      link: `/profissional/candidaturas`,
    })
    await notify({
      userId: swap.requestingProfessional.userId,
      type: "SWAP_APPROVED",
      title: "Sua troca foi aprovada",
      message: `Sua solicitação de troca de "${swap.shift.title}" foi aprovada pelo hospital`,
      link: `/profissional/trocas`,
    })

    return result
  }

  static async reject(swapRequestId: string, hospitalId: string) {
    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id: swapRequestId },
      include: { shift: true, requestingProfessional: { select: { userId: true } } },
    })
    if (!swap) throw new NotFoundError("Solicitação de troca não encontrada")
    if (swap.shift.hospitalId !== hospitalId) throw new ForbiddenError("Sem permissão sobre esta solicitação")
    if (swap.status !== SwapRequestStatus.OPEN) throw new ConflictError("Esta solicitação não está mais aberta")

    const updated = await prisma.shiftSwapRequest.update({
      where: { id: swapRequestId },
      data: { status: SwapRequestStatus.REJECTED },
    })

    await notify({
      userId: swap.requestingProfessional.userId,
      type: "SWAP_REJECTED",
      title: "Troca recusada",
      message: `Sua solicitação de troca de "${swap.shift.title}" foi recusada pelo hospital`,
      link: `/profissional/trocas`,
    })

    return updated
  }
}
