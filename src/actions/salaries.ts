"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { SalaryCalculationType, WorkDaysType, IncomeCategoryType } from '@/lib/db-types'

export interface SalaryInput {
  name: string
  description?: string
  accountId: string
  incomeCategory: IncomeCategoryType
  calculationType: SalaryCalculationType
  fixedAmount?: number
  hourlyRate?: number
  hoursPerDay?: number
  workDays?: WorkDaysType
  includeHolidays?: boolean
  isRecurring?: boolean
  startDate: string
  endDate?: string
  paymentDay?: number
}

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error("Não autorizado")
  return session
}

export async function getSalaries() {
  const session = await requireSession()
  return prisma.salary.findMany({
    where: { userId: session.userId },
    include: {
      account: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function createSalary(data: SalaryInput) {
  const session = await requireSession()
  await prisma.salary.create({
    data: {
      userId: session.userId,
      name: data.name,
      description: data.description || null,
      accountId: data.accountId,
      incomeCategory: data.incomeCategory,
      calculationType: data.calculationType,
      fixedAmount: data.fixedAmount ?? null,
      hourlyRate: data.hourlyRate ?? null,
      hoursPerDay: data.hoursPerDay ?? null,
      workDays: data.workDays ?? null,
      includeHolidays: data.includeHolidays ?? false,
      isRecurring: data.isRecurring ?? true,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      paymentDay: data.paymentDay ?? null,
      isActive: true,
    },
  })
  revalidatePath("/revenues")
  return { success: true }
}

export async function updateSalary(id: string, data: Partial<SalaryInput>) {
  const session = await requireSession()
  await prisma.salary.update({
    where: { id, userId: session.userId },
    data: {
      name: data.name,
      description: data.description ?? null,
      accountId: data.accountId,
      incomeCategory: data.incomeCategory,
      calculationType: data.calculationType,
      fixedAmount: data.fixedAmount ?? null,
      hourlyRate: data.hourlyRate ?? null,
      hoursPerDay: data.hoursPerDay ?? null,
      workDays: data.workDays ?? null,
      includeHolidays: data.includeHolidays,
      isRecurring: data.isRecurring,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : null,
      paymentDay: data.paymentDay ?? null,
    },
  })
  revalidatePath("/revenues")
  return { success: true }
}

export async function toggleSalaryActive(id: string, isActive: boolean) {
  const session = await requireSession()
  await prisma.salary.update({
    where: { id, userId: session.userId },
    data: { isActive },
  })
  revalidatePath("/revenues")
  return { success: true }
}

export async function deleteSalary(id: string) {
  const session = await requireSession()
  await prisma.salary.delete({ where: { id, userId: session.userId } })
  revalidatePath("/revenues")
  return { success: true }
}
