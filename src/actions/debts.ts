"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { DebtType, DebtStatus } from '@/lib/db-types'

export interface DebtInput {
  name: string
  description?: string
  type: DebtType
  totalAmount: number
  installmentValue?: number
  accountId: string
  categoryId?: string
  startDate: string
  dueDate?: string
  totalInstallments?: number
  installmentDay?: number
  interestRate?: number
}

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error("Não autorizado")
  return session
}

export async function getDebts() {
  const session = await requireSession()
  return prisma.debt.findMany({
    where: { userId: session.userId },
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      installments: { orderBy: { number: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function createDebt(data: DebtInput) {
  const session = await requireSession()

  const debt = await prisma.debt.create({
    data: {
      userId: session.userId,
      name: data.name,
      description: data.description || null,
      type: data.type,
      totalAmount: data.totalAmount,
      installmentValue: data.installmentValue ?? null,
      paidAmount: 0,
      accountId: data.accountId,
      categoryId: data.categoryId || null,
      startDate: new Date(data.startDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      totalInstallments: data.totalInstallments ?? null,
      remainingInstallments: data.totalInstallments ?? null,
      installmentDay: data.installmentDay ?? null,
      interestRate: data.interestRate ?? null,
      status: DebtStatus.ACTIVE,
    },
  })

  if (data.type === "INSTALLMENT" && data.totalInstallments && data.installmentValue && data.installmentDay) {
    const installments = Array.from({ length: data.totalInstallments }, (_, i) => {
      const due = new Date(data.startDate)
      due.setMonth(due.getMonth() + i)
      due.setDate(data.installmentDay!)
      return {
        debtId: debt.id,
        number: i + 1,
        amount: data.installmentValue!,
        dueDate: due,
      }
    })
    await prisma.debtInstallment.createMany({ data: installments })
  }

  revalidatePath("/debts")
  return { success: true }
}

export async function updateDebt(id: string, data: Partial<DebtInput>) {
  const session = await requireSession()
  await prisma.debt.update({
    where: { id, userId: session.userId },
    data: {
      name: data.name,
      description: data.description ?? null,
      type: data.type,
      totalAmount: data.totalAmount,
      installmentValue: data.installmentValue ?? null,
      accountId: data.accountId,
      categoryId: data.categoryId ?? null,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      installmentDay: data.installmentDay ?? null,
      interestRate: data.interestRate ?? null,
    },
  })
  revalidatePath("/debts")
  return { success: true }
}

export async function payDebtInstallment(id: string, installmentId: string, paid: boolean) {
  const session = await requireSession()
  const debt = await prisma.debt.findFirst({ where: { id, userId: session.userId } })
  if (!debt) return { error: "Dívida não encontrada" }

  const installment = await prisma.debtInstallment.findUnique({ where: { id: installmentId } })
  if (!installment) return { error: "Parcela não encontrada" }

  if (paid) {
    await prisma.debtInstallment.update({
      where: { id: installmentId },
      data: { status: "PAID", paidDate: new Date() },
    })
    await prisma.debt.update({
      where: { id },
      data: {
        paidAmount: { increment: Number(installment.amount) },
        remainingInstallments: { decrement: 1 },
      },
    })
  } else {
    await prisma.debtInstallment.update({
      where: { id: installmentId },
      data: { status: "PENDING", paidDate: null },
    })
    await prisma.debt.update({
      where: { id },
      data: {
        paidAmount: { decrement: Number(installment.amount) },
        remainingInstallments: { increment: 1 },
      },
    })
  }

  const updatedDebt = await prisma.debt.findUnique({ where: { id } })
  if (updatedDebt && Number(updatedDebt.paidAmount) >= Number(updatedDebt.totalAmount)) {
    await prisma.debt.update({ where: { id }, data: { status: "PAID_OFF" } })
  }

  revalidatePath("/debts")
  return { success: true }
}

export async function deleteDebt(id: string) {
  const session = await requireSession()
  await prisma.debt.delete({ where: { id, userId: session.userId } })
  revalidatePath("/debts")
  return { success: true }
}
