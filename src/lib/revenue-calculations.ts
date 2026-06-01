import type { WorkDaysType } from "@/lib/db-types"

// ─── Feriados BR (baseado em quibo-app/src/utils/holidays.ts) ───────────────

function calculateEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

const FIXED_HOLIDAY_MD = [
  "01-01", "04-20", "04-21", "05-01", "09-07", "10-12", "10-28",
  "11-02", "11-15", "11-20", "12-24", "12-25", "12-31",
]

function getHolidaysForYear(year: number): Date[] {
  const holidays: Date[] = FIXED_HOLIDAY_MD.map((md) => {
    const [month, day] = md.split("-").map(Number)
    return new Date(year, month - 1, day)
  })

  const easter = calculateEaster(year)
  const offsets = [-48, -47, -46, -2, 60, 61]
  for (const offset of offsets) {
    const d = new Date(easter)
    d.setDate(easter.getDate() + offset)
    holidays.push(d)
  }

  return holidays
}

function isHoliday(date: Date): boolean {
  const holidays = getHolidaysForYear(date.getFullYear())
  return holidays.some(
    (h) =>
      h.getDate() === date.getDate() &&
      h.getMonth() === date.getMonth() &&
      h.getFullYear() === date.getFullYear()
  )
}

function isWeekday(date: Date, includeHolidays: boolean): boolean {
  const dow = date.getDay()
  if (dow < 1 || dow > 5) return false
  if (includeHolidays) return true
  return !isHoliday(date)
}

export function getWorkDaysInMonth(
  year: number,
  month: number,
  includeHolidays = false
): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let day = 1; day <= daysInMonth; day++) {
    if (isWeekday(new Date(year, month, day), includeHolidays)) count++
  }
  return count
}

export function getTotalDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function calculateMonthlySalaryFromHourly(
  hourlyRate: number,
  hoursPerDay: number,
  year: number,
  month: number,
  workDays: WorkDaysType | null,
  includeHolidays = false
): number {
  const days =
    workDays === "ALL_DAYS"
      ? getTotalDaysInMonth(year, month)
      : getWorkDaysInMonth(year, month, includeHolidays)

  return hourlyRate * hoursPerDay * days
}

// ─── Vigência no mês ────────────────────────────────────────────────────────

export type RevenueForCalculation = {
  calculationType: "FIXED" | "HOURLY"
  fixedAmount: number
  hourlyRate: number
  hoursPerDay: number
  workDays: WorkDaysType | null
  includeHolidays: boolean
  isRecurring: boolean
  isActive: boolean
  startDate: Date
  endDate: Date | null
}

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// ─── Helpers de mês ─────────────────────────────────────────────────────────

export function prevMonthYear(year: number, month: number) {
  return month === 0
    ? { year: year - 1, month: 11 }
    : { year, month: month - 1 }
}

export function nextMonthYear(year: number, month: number) {
  return month === 11
    ? { year: year + 1, month: 0 }
    : { year, month: month + 1 }
}

export function fmtMonthName(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })
}

// ─── Vigência no mês ─────────────────────────────────────────────────────────

/**
 * Regra T+1 para receitas horárias:
 * O trabalho é feito no mês M, mas o pagamento é recebido no mês M+1.
 * Portanto, ao visualizar o mês M:
 *   - FIXED  → verifica vigência em M, calcula com dias de M
 *   - HOURLY → verifica vigência em M-1 (trabalho), calcula com dias de M-1
 */
export type RevenueMonthStatus = {
  /** Vigente no mês de pagamento visualizado */
  inMonth: boolean
  /** HOURLY em andamento no mês atual (trabalho em M, pagamento em M+1) */
  isHourlyCurrentWork: boolean
  /** Início após o último dia do mês de referência */
  notYetStarted: boolean
  /** Fim antes do primeiro dia do mês de referência */
  ended: boolean
  /** Mês de referência para o cálculo (M para FIXED, M-1 para HOURLY) */
  workYear: number
  workMonth: number
}

function checkVigency(
  revenue: RevenueForCalculation,
  year: number,
  month: number
): { inPeriod: boolean; notYetStarted: boolean; ended: boolean } {
  const periodStart = toDateOnly(new Date(year, month, 1))
  const periodEnd = toDateOnly(new Date(year, month + 1, 0))
  const start = toDateOnly(new Date(revenue.startDate))
  const end = revenue.endDate ? toDateOnly(new Date(revenue.endDate)) : null

  const notYetStarted = start > periodEnd
  const ended = end !== null && end < periodStart

  if (notYetStarted || ended) {
    return { inPeriod: false, notYetStarted, ended }
  }

  if (!revenue.isRecurring) {
    return {
      inPeriod: start.getFullYear() === year && start.getMonth() === month,
      notYetStarted: false,
      ended: false,
    }
  }

  return { inPeriod: true, notYetStarted: false, ended: false }
}

export function getRevenueMonthStatus(
  revenue: RevenueForCalculation,
  year: number,
  month: number
): RevenueMonthStatus {
  if (revenue.calculationType === "FIXED") {
    const { inPeriod, notYetStarted, ended } = checkVigency(revenue, year, month)
    return {
      inMonth: inPeriod,
      isHourlyCurrentWork: false,
      notYetStarted,
      ended,
      workYear: year,
      workMonth: month,
    }
  }

  // HOURLY: T+1 — o trabalho ocorre em M-1, o pagamento é recebido em M
  const { year: workYear, month: workMonth } = prevMonthYear(year, month)
  const { inPeriod, notYetStarted, ended } = checkVigency(revenue, workYear, workMonth)

  // Verifica também se o trabalho está ocorrendo no mês ATUAL (para mostrar preview)
  const currentWork = checkVigency(revenue, year, month)

  return {
    inMonth: inPeriod,
    isHourlyCurrentWork: !inPeriod && currentWork.inPeriod,
    notYetStarted: notYetStarted && !currentWork.inPeriod,
    ended,
    workYear,
    workMonth,
  }
}

/** Vigência no mês (ignora se está ativa ou inativa) */
export function isRevenueInMonth(
  revenue: RevenueForCalculation,
  year: number,
  month: number
): boolean {
  const status = getRevenueMonthStatus(revenue, year, month)
  return status.inMonth || status.isHourlyCurrentWork
}

/** Vigente no mês e com switch ativo (usado nos totais dos cards) */
export function isRevenueActiveInMonth(
  revenue: RevenueForCalculation,
  year: number,
  month: number
): boolean {
  return revenue.isActive && getRevenueMonthStatus(revenue, year, month).inMonth
}

export function getMonthlyFixedAmount(revenue: RevenueForCalculation): number {
  return revenue.calculationType === "FIXED" ? revenue.fixedAmount : 0
}

/**
 * Calcula o valor horário para o mês de pagamento M usando os dias do mês de
 * trabalho M-1 (regra T+1).
 */
export function getMonthlyHourlyAmount(
  revenue: RevenueForCalculation,
  year: number,
  month: number
): number {
  if (revenue.calculationType !== "HOURLY") return 0
  if (!revenue.hourlyRate || !revenue.hoursPerDay) return 0

  const { year: workYear, month: workMonth } = prevMonthYear(year, month)

  return calculateMonthlySalaryFromHourly(
    revenue.hourlyRate,
    revenue.hoursPerDay,
    workYear,
    workMonth,
    revenue.workDays,
    revenue.includeHolidays
  )
}

/**
 * Valor estimado no mês (para exibição na tabela).
 * FIXED → calcula com dias de M.
 * HOURLY → calcula com dias de M-1 (trabalho), mas só se vigente em M (pagamento).
 * Se isHourlyCurrentWork (trabalho em M, pagamento em M+1), retorna 0 (preview).
 */
export function getMonthlyRevenueAmount(
  revenue: RevenueForCalculation,
  year: number,
  month: number
): number {
  const status = getRevenueMonthStatus(revenue, year, month)

  if (!status.inMonth) return 0

  if (revenue.calculationType === "FIXED") {
    return getMonthlyFixedAmount(revenue)
  }

  return getMonthlyHourlyAmount(revenue, year, month)
}

export function sumMonthlyRevenues(
  revenues: RevenueForCalculation[],
  year: number,
  month: number
) {
  let fixedTotal = 0
  let hourlyTotal = 0

  for (const r of revenues) {
    if (!isRevenueActiveInMonth(r, year, month)) continue

    if (r.calculationType === "FIXED") {
      fixedTotal += getMonthlyFixedAmount(r)
    } else {
      hourlyTotal += getMonthlyHourlyAmount(r, year, month)
    }
  }

  return {
    fixedTotal,
    hourlyTotal,
    total: fixedTotal + hourlyTotal,
  }
}

function getRevenueWorkDaysInMonth(
  revenue: RevenueForCalculation,
  year: number,
  month: number
): number {
  if (revenue.workDays === "ALL_DAYS") {
    return getTotalDaysInMonth(year, month)
  }
  return getWorkDaysInMonth(year, month, revenue.includeHolidays)
}

const DEFAULT_FIXED_HOURS_PER_DAY = 8

function getRevenueHoursPerDay(revenue: RevenueForCalculation): number {
  if (revenue.calculationType === "HOURLY") {
    return revenue.hoursPerDay > 0 ? revenue.hoursPerDay : DEFAULT_FIXED_HOURS_PER_DAY
  }
  return revenue.hoursPerDay > 0 ? revenue.hoursPerDay : DEFAULT_FIXED_HOURS_PER_DAY
}

function getRevenueUsefulDaysInMonth(
  revenue: RevenueForCalculation,
  year: number,
  month: number
): number {
  if (revenue.calculationType === "HOURLY") {
    return getRevenueWorkDaysInMonth(revenue, year, month)
  }
  // Receita fixa: dias úteis do mês (padrão CLT), salvo se vier configurado como ALL_DAYS
  if (revenue.workDays === "ALL_DAYS") {
    return getTotalDaysInMonth(year, month)
  }
  return getWorkDaysInMonth(year, month, revenue.includeHolidays)
}

/**
 * Horas úteis no mês — soma de todas as receitas vigentes (fixas e por hora),
 * cada uma com sua carga horária × dias trabalhados no período.
 * HOURLY usa o mês de trabalho (M-1) para calcular os dias, conforme regra T+1.
 */
export function sumMonthlyWorkHours(
  revenues: RevenueForCalculation[],
  year: number,
  month: number
): number {
  let hours = 0

  for (const r of revenues) {
    if (!isRevenueActiveInMonth(r, year, month)) continue

    // HOURLY: calcula dias do mês de trabalho (M-1), não do mês de pagamento (M)
    const { year: workYear, month: workMonth } =
      r.calculationType === "HOURLY" ? prevMonthYear(year, month) : { year, month }

    const days = getRevenueUsefulDaysInMonth(r, workYear, workMonth)
    const hoursPerDay = getRevenueHoursPerDay(r)
    hours += hoursPerDay * days
  }

  return hours
}

/** Carga horária padrão para média por hora nos cards (dias úteis × 8h) */
export const STANDARD_WORK_HOURS_PER_DAY = 8

export type MonthlyRevenueStats = {
  total: number
  fixedTotal: number
  hourlyTotal: number
  daysInMonth: number
  workDaysInMonth: number
  workHoursInMonth: number
  avgPerWeek: number
  avgPerDay: number
  avgPerHour: number | null
}

export function computeMonthlyRevenueStats(
  revenues: RevenueForCalculation[],
  year: number,
  month: number
): MonthlyRevenueStats {
  // Total e médias usam fixo + por hora (receitas ativas e vigentes no mês)
  const { fixedTotal, hourlyTotal, total } = sumMonthlyRevenues(revenues, year, month)
  const daysInMonth = getTotalDaysInMonth(year, month)
  const workDaysInMonth = getWorkDaysInMonth(year, month, false)
  const workHoursInMonth = workDaysInMonth * STANDARD_WORK_HOURS_PER_DAY
  const weeksInMonth = daysInMonth / 7

  return {
    total,
    fixedTotal,
    hourlyTotal,
    daysInMonth,
    workDaysInMonth,
    workHoursInMonth,
    avgPerWeek: weeksInMonth > 0 ? total / weeksInMonth : 0,
    avgPerDay: workDaysInMonth > 0 ? total / workDaysInMonth : 0,
    avgPerHour: workHoursInMonth > 0 ? total / workHoursInMonth : null,
  }
}
