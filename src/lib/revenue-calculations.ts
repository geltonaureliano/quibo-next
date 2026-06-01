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

export function isRevenueActiveInMonth(
  revenue: RevenueForCalculation,
  year: number,
  month: number
): boolean {
  if (!revenue.isActive) return false

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  const start = new Date(revenue.startDate)
  const end = revenue.endDate ? new Date(revenue.endDate) : null

  if (start > monthEnd) return false
  if (end && end < monthStart) return false

  if (!revenue.isRecurring) {
    return start.getFullYear() === year && start.getMonth() === month
  }

  return true
}

export function getMonthlyFixedAmount(revenue: RevenueForCalculation): number {
  return revenue.calculationType === "FIXED" ? revenue.fixedAmount : 0
}

export function getMonthlyHourlyAmount(
  revenue: RevenueForCalculation,
  year: number,
  month: number
): number {
  if (revenue.calculationType !== "HOURLY") return 0
  if (!revenue.hourlyRate || !revenue.hoursPerDay) return 0

  return calculateMonthlySalaryFromHourly(
    revenue.hourlyRate,
    revenue.hoursPerDay,
    year,
    month,
    revenue.workDays,
    revenue.includeHolidays
  )
}

export function getMonthlyRevenueAmount(
  revenue: RevenueForCalculation,
  year: number,
  month: number
): number {
  if (!isRevenueActiveInMonth(revenue, year, month)) return 0

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
