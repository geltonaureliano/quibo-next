/**
 * Converte um valor desconhecido (Decimal do Prisma, string BRL, number) para number.
 * Versão robusta: lida com strings no formato BRL ("1.234,56") e objetos Decimal.
 */
export function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const normalized = v.replace(/\./g, "").replace(",", ".")
    const n = parseFloat(normalized)
    return Number.isFinite(n) ? n : 0
  }
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber()
  }
  return 0
}

/** Formata um número como moeda BRL. Ex: 1234.56 → "R$ 1.234,56" */
export function fmtCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

/**
 * Remove a máscara BRL e retorna o valor float.
 * Ex: "1.234,56" → 1234.56
 */
export function parseCurrencyToFloat(masked: string): number {
  const digits = masked.replace(/\D/g, "")
  if (!digits) return 0
  return parseInt(digits, 10) / 100
}

/**
 * Aplica máscara BRL a uma string de dígitos.
 * Ex: "123456" → "1.234,56"
 */
export function formatCurrencyMask(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  const num = parseInt(digits, 10) / 100
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Converte um valor float para string mascarada BRL.
 * Ex: 1234.56 → "1.234,56"
 */
export function amountToMask(amount: number): string {
  if (!amount || amount <= 0) return ""
  return formatCurrencyMask(Math.round(amount * 100).toString())
}
