import argon2 from "argon2"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { prisma } from "../../prisma/client"
import { AppError, ConflictError, UnauthorizedError } from "../../shared/errors/AppError"
import { sendPasswordResetEmail } from "../../shared/services/email.service"
import { geocodeByZipCode } from "../../shared/services/geocoding.service"
import { LoginDTO, RegisterHospitalDTO, RegisterProfessionalDTO } from "./auth.dto"
import { Prisma, UserRole } from "@prisma/client"

const WEB_URL = process.env.WEB_URL ?? "https://plantoes-medicos-web.vercel.app"
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
}

interface TokenPayload {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    role: UserRole
  }
}

function issueAccessToken(userId: string, role: UserRole): string {
  return jwt.sign({ sub: userId, role }, process.env.JWT_ACCESS_SECRET!, {
    algorithm: "HS256",
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as jwt.SignOptions["expiresIn"],
  })
}

function issueRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET!, {
    algorithm: "HS256",
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"],
  })
}

async function saveRefreshToken(userId: string, token: string): Promise<void> {
  const payload = jwt.decode(token) as { exp: number }
  const expiresAt = new Date(payload.exp * 1000)
  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  })
}

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

export class AuthService {
  static async login(data: LoginDTO): Promise<TokenPayload> {
    const user = await prisma.user.findUnique({ where: { email: data.email } })

    if (!user) throw new UnauthorizedError("Credenciais inválidas")

    const valid = await argon2.verify(user.passwordHash, data.password)
    if (!valid) throw new UnauthorizedError("Credenciais inválidas")

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError("Conta inativa. Entre em contato com o suporte.")
    }

    const accessToken = issueAccessToken(user.id, user.role)
    const refreshToken = issueRefreshToken(user.id)
    await saveRefreshToken(user.id, refreshToken)

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    }
  }

  static async registerHospital(data: RegisterHospitalDTO): Promise<TokenPayload> {
    const passwordHash = await argon2.hash(data.password, ARGON2_OPTIONS)

    try {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: UserRole.HOSPITAL,
          hospitalProfile: {
            create: {
              name: data.name,
              cnpj: data.cnpj,
              phone: data.phone,
              street: data.street,
              number: data.number,
              complement: data.complement,
              neighborhood: data.neighborhood,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
            },
          },
        },
        select: { id: true, email: true, role: true },
      })

      const accessToken = issueAccessToken(user.id, user.role)
      const refreshToken = issueRefreshToken(user.id)
      await saveRefreshToken(user.id, refreshToken)

      const geo = await geocodeByZipCode(data.zipCode)
      if (geo) {
        await prisma.hospitalProfile.update({
          where: { userId: user.id },
          data: { latitude: geo.latitude, longitude: geo.longitude },
        })
      }

      return { accessToken, refreshToken, user }
    } catch (err) {
      handlePrismaConflict(err)
    }
  }

  static async registerProfessional(data: RegisterProfessionalDTO): Promise<TokenPayload> {
    const passwordHash = await argon2.hash(data.password, ARGON2_OPTIONS)

    try {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: UserRole.PROFESSIONAL,
          professionalProfile: {
            create: {
              name: data.name,
              cpf: data.cpf,
              phone: data.phone,
              councilType: data.councilType,
              councilNumber: data.councilNumber,
              councilState: data.councilState,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
              specialties: {
                create: data.specialtyIds.map((specialtyId) => ({ specialtyId })),
              },
            },
          },
        },
        select: { id: true, email: true, role: true },
      })

      const accessToken = issueAccessToken(user.id, user.role)
      const refreshToken = issueRefreshToken(user.id)
      await saveRefreshToken(user.id, refreshToken)

      if (data.zipCode) {
        const geo = await geocodeByZipCode(data.zipCode)
        if (geo) {
          await prisma.professionalProfile.update({
            where: { userId: user.id },
            data: { latitude: geo.latitude, longitude: geo.longitude },
          })
        }
      }

      return { accessToken, refreshToken, user }
    } catch (err) {
      handlePrismaConflict(err)
    }
  }

  static async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { id: true, email: true, role: true } } },
    })

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token inválido ou expirado")
    }

    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!, {
        algorithms: ["HS256"],
      })
    } catch {
      throw new UnauthorizedError("Refresh token inválido")
    }

    const accessToken = issueAccessToken(stored.user.id, stored.user.role)
    return { accessToken }
  }

  static async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        hospitalProfile: {
          select: {
            id: true,
            name: true,
            cnpj: true,
            phone: true,
            street: true,
            number: true,
            complement: true,
            neighborhood: true,
            city: true,
            state: true,
            zipCode: true,
            latitude: true,
            longitude: true,
            defaultRejectionMessage: true,
          },
        },
        professionalProfile: {
          select: {
            id: true,
            name: true,
            cpf: true,
            phone: true,
            councilType: true,
            councilNumber: true,
            councilState: true,
            city: true,
            state: true,
            zipCode: true,
            latitude: true,
            longitude: true,
            specialties: {
              select: {
                specialty: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    })

    if (!user) throw new AppError("Usuário não encontrado", 404, "NOT_FOUND")
    return user
  }

  static async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return

    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    })

    const link = `${WEB_URL}/redefinir-senha?token=${rawToken}`
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Link de redefinição de senha: ${link}`)
    }
    await sendPasswordResetEmail(user.email, link)
  }

  static async resetPassword(token: string, password: string): Promise<void> {
    const tokenHash = hashToken(token)
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError("Link de redefinição inválido ou expirado")
    }

    const passwordHash = await argon2.hash(password, ARGON2_OPTIONS)

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ])
  }
}
