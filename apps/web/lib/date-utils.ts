import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Formata uma data "somente-dia" (ex: data de um plantão, armazenada como meia-noite UTC)
 * sem deixar o fuso horário do navegador deslocar o dia exibido — new Date(iso) interpretado
 * direto com toLocaleDateString/format do date-fns usa o fuso local e pode mostrar o dia
 * anterior para quem está em fusos atrás de UTC (ex: Brasil).
 */
export function formatDateOnly(iso: string, fmt = 'dd/MM/yyyy'): string {
  const d = new Date(iso)
  const asLocal = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return format(asLocal, fmt, { locale: ptBR })
}
