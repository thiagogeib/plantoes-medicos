import { parse } from "csv-parse/sync"
import { stringify } from "csv-stringify/sync"
import { CompensationType, CouncilType, StaffType } from "@prisma/client"
import { prisma } from "../../prisma/client"
import { ShiftService } from "../shifts/shift.service"
import { AppError } from "../../shared/errors/AppError"

const SHIFT_TEMPLATE_HEADERS = [
  "titulo",
  "descricao",
  "especialidade",
  "perfil", // CRM ou COREN
  "data", // YYYY-MM-DD
  "horaInicio", // HH:mm
  "horaFim", // HH:mm
  "local",
  "vagas",
  "formaCompensacao", // MONEY, HOUR_BANK ou OTHER
  "notaCompensacao",
]

export interface RowResult {
  linha: number
  sucesso: boolean
  erro?: string
}

export class BulkService {
  static getShiftTemplateCsv(): string {
    return stringify([SHIFT_TEMPLATE_HEADERS, [
      "Plantão UTI noturno",
      "Cobertura de leito na UTI adulto",
      "UTI Adulto",
      "CRM",
      "2026-09-01",
      "19:00",
      "07:00",
      "UTI Adulto - 3º andar",
      "1",
      "MONEY",
      "",
    ]])
  }

  static async importShifts(hospitalId: string, fileBuffer: Buffer): Promise<RowResult[]> {
    let rows: Record<string, string>[]
    try {
      rows = parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true })
    } catch {
      throw new AppError("Não foi possível ler o arquivo CSV enviado", 400, "INVALID_CSV")
    }

    if (rows.length === 0) throw new AppError("O arquivo está vazio", 400, "INVALID_CSV")
    if (rows.length > 200) {
      throw new AppError("Envie no máximo 200 plantões por arquivo", 400, "TOO_MANY_ROWS")
    }

    const specialties = await prisma.specialty.findMany()
    const specialtyByName = new Map(
      specialties.map((s) => [s.name.trim().toLowerCase(), s.id])
    )

    const results: RowResult[] = []

    for (let i = 0; i < rows.length; i++) {
      const linha = i + 2 // +1 cabeçalho, +1 índice 1-based
      const row = rows[i]
      try {
        const specialtyId = specialtyByName.get((row.especialidade ?? "").trim().toLowerCase())
        if (!specialtyId) {
          throw new Error(`Especialidade "${row.especialidade}" não encontrada`)
        }

        const perfil = (row.perfil ?? "").trim().toUpperCase()
        if (perfil !== "CRM" && perfil !== "COREN") {
          throw new Error('Coluna "perfil" deve ser CRM ou COREN')
        }

        const compensationType = (row.formaCompensacao ?? "MONEY").trim().toUpperCase()
        if (!Object.values(CompensationType).includes(compensationType as CompensationType)) {
          throw new Error('Coluna "formaCompensacao" deve ser MONEY, HOUR_BANK ou OTHER')
        }

        const slots = Number(row.vagas)
        if (!Number.isInteger(slots) || slots < 1 || slots > 50) {
          throw new Error('Coluna "vagas" deve ser um número entre 1 e 50')
        }

        if (!row.titulo || row.titulo.trim().length < 3) {
          throw new Error("Título deve ter no mínimo 3 caracteres")
        }
        if (!row.descricao || row.descricao.trim().length < 10) {
          throw new Error("Descrição deve ter no mínimo 10 caracteres")
        }
        if (!row.local || row.local.trim().length < 3) {
          throw new Error("Local deve ter no mínimo 3 caracteres")
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(row.data ?? "")) {
          throw new Error('Coluna "data" deve estar no formato YYYY-MM-DD')
        }
        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
        if (!timeRegex.test(row.horaInicio ?? "") || !timeRegex.test(row.horaFim ?? "")) {
          throw new Error("Horários devem estar no formato HH:mm")
        }

        await ShiftService.createShift(hospitalId, {
          title: row.titulo.trim(),
          description: row.descricao.trim(),
          specialtyId,
          requiredCouncilType: perfil as CouncilType,
          date: row.data,
          startTime: row.horaInicio,
          endTime: row.horaFim,
          location: row.local.trim(),
          slots,
          compensationType: compensationType as CompensationType,
          compensationNote: row.notaCompensacao?.trim() || undefined,
        })

        results.push({ linha, sucesso: true })
      } catch (err) {
        results.push({ linha, sucesso: false, erro: err instanceof Error ? err.message : "Erro desconhecido" })
      }
    }

    return results
  }

  static async exportStaffHours(hospitalId: string): Promise<string> {
    const staff = await prisma.hospitalStaff.findMany({
      where: { hospitalId },
      include: { professional: { select: { name: true, cpf: true } } },
      orderBy: { professional: { name: "asc" } },
    })

    const header = ["cpf", "nome", "tipo", "bancoDeHorasHoras", "diasDeFolgaDisponiveis", "status"]
    const rows = staff.map((s) => [
      s.professional.cpf,
      s.professional.name,
      s.type,
      (s.hourBankMinutes / 60).toFixed(2),
      String(s.availableDaysOff),
      s.status,
    ])

    return stringify([header, ...rows])
  }

  static async importStaffHours(hospitalId: string, fileBuffer: Buffer): Promise<RowResult[]> {
    let rows: Record<string, string>[]
    try {
      rows = parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true })
    } catch {
      throw new AppError("Não foi possível ler o arquivo CSV enviado", 400, "INVALID_CSV")
    }

    if (rows.length === 0) throw new AppError("O arquivo está vazio", 400, "INVALID_CSV")
    if (rows.length > 500) {
      throw new AppError("Envie no máximo 500 linhas por arquivo", 400, "TOO_MANY_ROWS")
    }

    const results: RowResult[] = []

    for (let i = 0; i < rows.length; i++) {
      const linha = i + 2
      const row = rows[i]
      try {
        const cpf = (row.cpf ?? "").replace(/\D/g, "")
        if (cpf.length !== 11) throw new Error('Coluna "cpf" inválida')

        const staff = await prisma.hospitalStaff.findFirst({
          where: { hospitalId, professional: { cpf } },
        })
        if (!staff) throw new Error("Profissional não encontrado na equipe deste hospital")

        const data: Record<string, unknown> = {}

        if (row.bancoDeHorasHoras !== undefined && row.bancoDeHorasHoras !== "") {
          const hours = Number(row.bancoDeHorasHoras)
          if (Number.isNaN(hours)) throw new Error('Coluna "bancoDeHorasHoras" inválida')
          data.hourBankMinutes = Math.round(hours * 60)
        }

        if (row.diasDeFolgaDisponiveis !== undefined && row.diasDeFolgaDisponiveis !== "") {
          const days = Number(row.diasDeFolgaDisponiveis)
          if (!Number.isInteger(days) || days < 0) {
            throw new Error('Coluna "diasDeFolgaDisponiveis" inválida')
          }
          data.availableDaysOff = days
        }

        if (row.tipo !== undefined && row.tipo !== "") {
          const tipo = row.tipo.trim().toUpperCase()
          if (!Object.values(StaffType).includes(tipo as StaffType)) {
            throw new Error('Coluna "tipo" deve ser FIXO ou AVULSO')
          }
          data.type = tipo
        }

        if (Object.keys(data).length === 0) throw new Error("Nenhum campo para atualizar")

        await prisma.hospitalStaff.update({ where: { id: staff.id }, data })
        results.push({ linha, sucesso: true })
      } catch (err) {
        results.push({ linha, sucesso: false, erro: err instanceof Error ? err.message : "Erro desconhecido" })
      }
    }

    return results
  }
}
