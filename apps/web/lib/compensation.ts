import type { CompensationType } from '@plantoes-medicos/types'

export const compensationLabels: Record<CompensationType, string> = {
  MONEY: 'Pagamento em dinheiro',
  HOUR_BANK: 'Banco de horas',
  OTHER: 'Outra modalidade',
}

export const compensationOptions: { value: CompensationType; label: string }[] = [
  { value: 'MONEY', label: compensationLabels.MONEY },
  { value: 'HOUR_BANK', label: compensationLabels.HOUR_BANK },
  { value: 'OTHER', label: compensationLabels.OTHER },
]
