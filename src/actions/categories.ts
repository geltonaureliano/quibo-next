"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { TransactionType } from '@/lib/db-types'

export interface CategoryInput {
  name: string
  type: TransactionType
  color?: string
  icon?: string
  parentId?: string
}

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error("Não autorizado")
  return session
}

export async function getCategories() {
  const session = await requireSession()
  return prisma.category.findMany({
    where: { userId: session.userId },
    include: { parent: { select: { id: true, name: true } }, _count: { select: { transactions: true } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  })
}

export async function createCategory(data: CategoryInput) {
  const session = await requireSession()
  await prisma.category.create({
    data: {
      userId: session.userId,
      name: data.name,
      type: data.type,
      color: data.color || "#6b7280",
      icon: data.icon || "tabler:tag",
      parentId: data.parentId || null,
    },
  })
  revalidatePath("/categories")
  return { success: true }
}

export async function updateCategory(id: string, data: CategoryInput) {
  const session = await requireSession()
  await prisma.category.update({
    where: { id, userId: session.userId },
    data: {
      name: data.name,
      type: data.type,
      color: data.color,
      icon: data.icon,
      parentId: data.parentId ?? null,
    },
  })
  revalidatePath("/categories")
  return { success: true }
}

export async function archiveCategory(id: string, archived: boolean) {
  const session = await requireSession()
  await prisma.category.update({
    where: { id, userId: session.userId },
    data: { archived },
  })
  revalidatePath("/categories")
  return { success: true }
}

export async function deleteCategory(id: string) {
  const session = await requireSession()
  const cat = await prisma.category.findUnique({
    where: { id, userId: session.userId },
    include: { _count: { select: { transactions: true } } },
  })
  if (!cat) return { error: "Categoria não encontrada" }

  if (cat._count.transactions > 0) {
    await prisma.category.update({ where: { id }, data: { archived: true } })
  } else {
    await prisma.category.delete({ where: { id } })
  }
  revalidatePath("/categories")
  return { success: true }
}
