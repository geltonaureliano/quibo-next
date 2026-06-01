export type MonthYear = {
  /** Mês no formato 1–12 (janeiro = 1) */
  month: number
  year: number
}

export function getCurrentMonthYear(): MonthYear {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

/** Converte mês 1–12 para índice 0–11 usado em `Date` e cálculos de receita */
export function toDateMonthIndex(month1to12: number): number {
  return month1to12 - 1
}

export function formatMonthYear(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })
}

export function parseMonthYearSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): MonthYear {
  const current = getCurrentMonthYear()
  const rawMonth = Array.isArray(searchParams.month) ? searchParams.month[0] : searchParams.month
  const rawYear = Array.isArray(searchParams.year) ? searchParams.year[0] : searchParams.year

  const month = rawMonth ? parseInt(rawMonth, 10) : current.month
  const year = rawYear ? parseInt(rawYear, 10) : current.year

  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return current
  }
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    return current
  }

  return { month, year }
}

export function buildMonthYearQuery(month: number, year: number): string {
  return `month=${month}&year=${year}`
}
