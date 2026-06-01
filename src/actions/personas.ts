"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"

export interface PersonaInput {
  name: string
  description?: string
  color?: string
  icon?: string
}

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error("Não autorizado")
  return session
}

export async function getPersonas(includeArchived = false) {
  const session = await requireSession()
  return prisma.persona.findMany({
    where: { userId: session.userId, ...(includeArchived ? {} : { archived: false }) },
    orderBy: { name: "asc" },
  })
}

export async function createPersona(data: PersonaInput) {
  const session = await requireSession()
  await prisma.persona.create({
    data: {
      userId: session.userId,
      name: data.name,
      description: data.description || null,
      color: data.color || "#3b82f6",
      icon: data.icon || "tabler:user",
    },
  })
  revalidatePath("/personas")
  return { success: true }
}

export async function updatePersona(id: string, data: PersonaInput) {
  const session = await requireSession()
  await prisma.persona.update({
    where: { id, userId: session.userId },
    data: {
      name: data.name,
      description: data.description ?? null,
      color: data.color,
      icon: data.icon,
    },
  })
  revalidatePath("/personas")
  return { success: true }
}

export async function archivePersona(id: string, archived: boolean) {
  const session = await requireSession()
  await prisma.persona.update({
    where: { id, userId: session.userId },
    data: { archived },
  })
  revalidatePath("/personas")
  return { success: true }
}

export async function deletePersona(id: string) {
  const session = await requireSession()
  await prisma.persona.delete({ where: { id, userId: session.userId } })
  revalidatePath("/personas")
  return { success: true }
}
