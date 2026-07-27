import { Prisma } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { ConflictError } from "../../shared/errors/AppError"
import type { UpdateOwnHospitalProfileInput, UpdateOwnProfessionalProfileInput } from "./profile.dto"

function handlePrismaConflict(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = (err.meta?.target as string[]) ?? []
    if (target.includes("email")) throw new ConflictError("Email já cadastrado")
    if (target.includes("cnpj")) throw new ConflictError("CNPJ já cadastrado")
    if (target.includes("cpf")) throw new ConflictError("CPF já cadastrado")
    throw new ConflictError("Registro já cadastrado")
  }
  throw err
}

export class ProfileService {
  static async updateOwnHospital(userId: string, input: UpdateOwnHospitalProfileInput) {
    const { email, ...profileData } = input
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          ...(email ? { email } : {}),
          hospitalProfile: { update: profileData },
        },
        select: {
          id: true, email: true, role: true, status: true, updatedAt: true,
          hospitalProfile: true,
        },
      })
    } catch (err) {
      handlePrismaConflict(err)
    }
  }

  static async updateOwnProfessional(userId: string, input: UpdateOwnProfessionalProfileInput) {
    const { email, specialtyIds, ...profileData } = input
    const specialtiesUpdate = specialtyIds
      ? { deleteMany: {}, create: specialtyIds.map((specialtyId) => ({ specialtyId })) }
      : undefined

    try {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          ...(email ? { email } : {}),
          professionalProfile: {
            update: {
              ...profileData,
              ...(specialtiesUpdate ? { specialties: specialtiesUpdate } : {}),
            },
          },
        },
        select: {
          id: true, email: true, role: true, status: true, updatedAt: true,
          professionalProfile: {
            include: { specialties: { select: { specialtyId: true } } },
          },
        },
      })
    } catch (err) {
      handlePrismaConflict(err)
    }
  }
}
