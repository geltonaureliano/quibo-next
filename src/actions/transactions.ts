"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { TransactionType, TransactionStatus } from '@/lib/db-types'
import crypto from "node:crypto"

export interface TransactionInput {
  description: string
  amount: number
  type: TransactionType
  status: TransactionStatus
  date: string
  accountId?: string
  creditCardId?: string
  categoryId?: string
  notes?: string
  isRecurring?: boolean
  recurrenceMonths?: number
}

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error("Não autorizado")
  return session
}

export async function getTransactions(params?: {
  startDate?: string
  endDate?: string
  type?: TransactionType
  status?: TransactionStatus
  accountId?: string
  creditCardId?: string
  page?: number
  limit?: number
}) {
  const session = await requireSession()
  const page = params?.page ?? 1
  const limit = params?.limit ?? 30
  const skip = (page - 1) * limit

  const where = {
    userId: session.userId,
    ...(params?.startDate && params?.endDate
      ? { date: { gte: new Date(params.startDate), lte: new Date(params.endDate) } }
      : {}),
    ...(params?.type ? { type: params.type } : {}),
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.accountId ? { accountId: params.accountId } : {}),
    ...(params?.creditCardId ? { creditCardId: params.creditCardId } : {}),
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, color: true } },
        creditCard: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ])

  return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function createTransaction(data: TransactionInput) {
  const session = await requireSession()

  if (data.isRecurring && data.recurrenceMonths && data.recurrenceMonths > 1) {
    const groupId = crypto.randomUUID()
    const transactions = Array.from({ length: data.recurrenceMonths }, (_, i) => {
      const date = new Date(data.date)
      date.setMonth(date.getMonth() + i)
      return {
        userId: session.userId,
        description: data.description,
        amount: data.amount,
        type: data.type,
        status: i === 0 ? data.status : TransactionStatus.PENDING,
        date,
        accountId: data.accountId || null,
        creditCardId: data.creditCardId || null,
        categoryId: data.categoryId || null,
        notes: data.notes || null,
        isRecurring: true,
        recurrenceRule: "monthly",
        recurrenceGroupId: groupId,
        tags: [],
        attachments: [],
      }
    })
    await prisma.transaction.createMany({ data: transactions })
  } else {
    await prisma.transaction.create({
      data: {
        userId: session.userId,
        description: data.description,
        amount: data.amount,
        type: data.type,
        status: data.status,
        date: new Date(data.date),
        accountId: data.accountId || null,
        creditCardId: data.creditCardId || null,
        categoryId: data.categoryId || null,
        notes: data.notes || null,
        tags: [],
        attachments: [],
      },
    })
  }

  revalidatePath("/transactions")
  return { success: true }
}

export async function updateTransaction(
  id: string,
  data: Partial<TransactionInput>,
  mode: "single" | "all" | "future" = "single"
) {
  const session = await requireSession()
  const tx = await prisma.transaction.findFirst({ where: { id, userId: session.userId } })
  if (!tx) return { error: "Transação não encontrada" }

  const updateData = {
    description: data.description,
    amount: data.amount,
    type: data.type,
    status: data.status,
    date: data.date ? new Date(data.date) : undefined,
    accountId: data.accountId ?? null,
    creditCardId: data.creditCardId ?? null,
    categoryId: data.categoryId ?? null,
    notes: data.notes ?? null,
    paidAt: data.status === "PAID" ? new Date() : null,
  }

  if (mode === "single" || !tx.recurrenceGroupId) {
    await prisma.transaction.update({ where: { id }, data: updateData })
  } else if (mode === "all") {
    await prisma.transaction.updateMany({
      where: { recurrenceGroupId: tx.recurrenceGroupId, userId: session.userId },
      data: updateData,
    })
  } else {
    await prisma.transaction.updateMany({
      where: {
        recurrenceGroupId: tx.recurrenceGroupId,
        userId: session.userId,
        date: { gte: tx.date },
      },
      data: updateData,
    })
  }

  revalidatePath("/transactions")
  return { success: true }
}

export async function deleteTransaction(
  id: string,
  mode: "single" | "all" | "future" = "single"
) {
  const session = await requireSession()
  const tx = await prisma.transaction.findFirst({ where: { id, userId: session.userId } })
  if (!tx) return { error: "Transação não encontrada" }

  if (mode === "single" || !tx.recurrenceGroupId) {
    await prisma.transaction.delete({ where: { id } })
  } else if (mode === "all") {
    await prisma.transaction.deleteMany({
      where: { recurrenceGroupId: tx.recurrenceGroupId, userId: session.userId },
    })
  } else {
    await prisma.transaction.deleteMany({
      where: {
        recurrenceGroupId: tx.recurrenceGroupId,
        userId: session.userId,
        date: { gte: tx.date },
      },
    })
  }

  revalidatePath("/transactions")
  return { success: true }
}
