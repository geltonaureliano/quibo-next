"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { CardBrand, InvoiceStatus } from '@/lib/db-types'

export interface CreditCardInput {
  name: string
  brand: CardBrand
  limit: number
  closingDay: number
  dueDay: number
  color?: string
  personaId?: string
}

export interface InvoiceInput {
  month: number
  year: number
  totalAmount: number
  dueDate: string
  paidAmount?: number
}

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error("Não autorizado")
  return session
}

export async function getCreditCards() {
  const session = await requireSession()
  return prisma.creditCard.findMany({
    where: { userId: session.userId },
    include: {
      persona: { select: { id: true, name: true, color: true } },
      invoices: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 3 },
      _count: { select: { transactions: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function createCreditCard(data: CreditCardInput) {
  const session = await requireSession()
  await prisma.creditCard.create({
    data: {
      userId: session.userId,
      name: data.name,
      brand: data.brand,
      limit: data.limit,
      closingDay: data.closingDay,
      dueDay: data.dueDay,
      color: data.color || "#6366f1",
      personaId: data.personaId || null,
    },
  })
  revalidatePath("/credit-cards")
  return { success: true }
}

export async function updateCreditCard(id: string, data: CreditCardInput) {
  const session = await requireSession()
  await prisma.creditCard.update({
    where: { id, userId: session.userId },
    data: {
      name: data.name,
      brand: data.brand,
      limit: data.limit,
      closingDay: data.closingDay,
      dueDay: data.dueDay,
      color: data.color,
      personaId: data.personaId ?? null,
    },
  })
  revalidatePath("/credit-cards")
  return { success: true }
}

export async function toggleCreditCardActive(id: string, isActive: boolean) {
  const session = await requireSession()
  await prisma.creditCard.update({
    where: { id, userId: session.userId },
    data: { isActive },
  })
  revalidatePath("/credit-cards")
  return { success: true }
}

export async function deleteCreditCard(id: string) {
  const session = await requireSession()
  await prisma.creditCard.delete({ where: { id, userId: session.userId } })
  revalidatePath("/credit-cards")
  return { success: true }
}

export async function createInvoice(creditCardId: string, data: InvoiceInput) {
  const session = await requireSession()
  const card = await prisma.creditCard.findFirst({ where: { id: creditCardId, userId: session.userId } })
  if (!card) return { error: "Cartão não encontrado" }

  const existing = await prisma.invoice.findFirst({
    where: { creditCardId, month: data.month, year: data.year },
  })
  if (existing) return { error: "Já existe fatura para este mês" }

  await prisma.invoice.create({
    data: {
      creditCardId,
      userId: session.userId,
      month: data.month,
      year: data.year,
      totalAmount: data.totalAmount,
      paidAmount: data.paidAmount ?? 0,
      dueDate: new Date(data.dueDate),
      status: InvoiceStatus.PENDING,
    },
  })
  revalidatePath("/credit-cards")
  return { success: true }
}

export async function payInvoice(invoiceId: string) {
  const session = await requireSession()
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: InvoiceStatus.PAID, paidAt: new Date(), paidAmount: undefined },
  })
  revalidatePath("/credit-cards")
  return { success: true }
}

export async function deleteInvoice(invoiceId: string) {
  await prisma.invoice.delete({ where: { id: invoiceId } })
  revalidatePath("/credit-cards")
  return { success: true }
}
