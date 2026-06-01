"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { AccountType } from '@/lib/db-types'

export interface AccountInput {
  name: string
  type: AccountType
  bank?: string
  agency?: string
  accountNumber?: string
  initialBalance?: number
  color?: string
  icon?: string
}

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error("Não autorizado")
  return session
}

export async function getAccounts() {
  const session = await requireSession()
  return prisma.account.findMany({
    where: { userId: session.userId, archived: false },
    orderBy: { createdAt: "desc" },
  })
}

export async function createAccount(data: AccountInput) {
  const session = await requireSession()
  const balance = data.initialBalance ?? 0

  await prisma.account.create({
    data: {
      userId: session.userId,
      name: data.name,
      type: data.type,
      bank: data.bank || null,
      agency: data.agency || null,
      accountNumber: data.accountNumber || null,
      balance,
      initialBalance: balance,
      color: data.color || "#3b82f6",
      icon: data.icon || "tabler:wallet",
    },
  })
  revalidatePath("/accounts")
  return { success: true }
}

export async function updateAccount(id: string, data: Partial<AccountInput>) {
  const session = await requireSession()
  await prisma.account.update({
    where: { id, userId: session.userId },
    data: {
      name: data.name,
      type: data.type,
      bank: data.bank ?? null,
      agency: data.agency ?? null,
      accountNumber: data.accountNumber ?? null,
      color: data.color,
      icon: data.icon,
    },
  })
  revalidatePath("/accounts")
  return { success: true }
}

export async function toggleAccountActive(id: string, isActive: boolean) {
  const session = await requireSession()
  await prisma.account.update({
    where: { id, userId: session.userId },
    data: { isActive },
  })
  revalidatePath("/accounts")
  return { success: true }
}

export async function setPrimaryAccount(id: string) {
  const session = await requireSession()
  await prisma.$transaction([
    prisma.account.updateMany({
      where: { userId: session.userId },
      data: { isPrimary: false },
    }),
    prisma.account.update({
      where: { id, userId: session.userId },
      data: { isPrimary: true },
    }),
  ])
  revalidatePath("/accounts")
  return { success: true }
}

export async function deleteAccount(id: string) {
  const session = await requireSession()
  const account = await prisma.account.findUnique({
    where: { id, userId: session.userId },
    include: { _count: { select: { transactions: true } } },
  })
  if (!account) return { error: "Conta não encontrada" }

  if (account._count.transactions > 0) {
    await prisma.account.update({ where: { id }, data: { archived: true } })
  } else {
    await prisma.account.delete({ where: { id } })
  }
  revalidatePath("/accounts")
  return { success: true }
}
