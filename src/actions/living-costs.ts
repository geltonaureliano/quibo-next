"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { LivingCostSourceType } from '@/lib/db-types'

export interface LivingCostInput {
  name: string
  description?: string
  amount: number
  sourceType: LivingCostSourceType
  accountId?: string
  creditCardId?: string
  categoryId?: string
  dayOfMonth: number
  startDate?: string
  endDate?: string
}

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error("Não autorizado")
  return session
}

export async function getLivingCosts() {
  const session = await requireSession()
  return prisma.livingCost.findMany({
    where: { userId: session.userId },
    include: {
      account: { select: { id: true, name: true } },
      creditCard: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function createLivingCost(data: LivingCostInput) {
  const session = await requireSession()
  await prisma.livingCost.create({
    data: {
      userId: session.userId,
      name: data.name,
      description: data.description || null,
      amount: data.amount,
      sourceType: data.sourceType,
      accountId: data.accountId || null,
      creditCardId: data.creditCardId || null,
      categoryId: data.categoryId || null,
      dayOfMonth: data.dayOfMonth,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      isActive: true,
    },
  })
  revalidatePath("/living-costs")
  return { success: true }
}

export async function updateLivingCost(id: string, data: LivingCostInput) {
  const session = await requireSession()
  await prisma.livingCost.update({
    where: { id, userId: session.userId },
    data: {
      name: data.name,
      description: data.description ?? null,
      amount: data.amount,
      sourceType: data.sourceType,
      accountId: data.accountId ?? null,
      creditCardId: data.creditCardId ?? null,
      categoryId: data.categoryId ?? null,
      dayOfMonth: data.dayOfMonth,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  })
  revalidatePath("/living-costs")
  return { success: true }
}

export async function toggleLivingCostActive(id: string, isActive: boolean) {
  const session = await requireSession()
  await prisma.livingCost.update({
    where: { id, userId: session.userId },
    data: { isActive },
  })
  revalidatePath("/living-costs")
  return { success: true }
}

export async function deleteLivingCost(id: string) {
  const session = await requireSession()
  await prisma.livingCost.delete({ where: { id, userId: session.userId } })
  revalidatePath("/living-costs")
  return { success: true }
}
