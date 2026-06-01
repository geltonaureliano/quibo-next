"use server"

import { prisma } from "@/lib/prisma"
import { hashPassword, verifyPassword } from "@/lib/auth"
import { createSession, deleteSession } from "@/lib/session"
import { redirect } from "next/navigation"

export async function login(_prev: unknown, formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string

  if (!email || !password) return { error: "Email e senha são obrigatórios" }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !verifyPassword(password, user.password)) {
    return { error: "Email ou senha incorretos" }
  }

  await createSession({ userId: user.id, name: user.name, email: user.email })
  redirect("/dashboard")
}

export async function register(_prev: unknown, formData: FormData) {
  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string

  if (!name || !email || !password) return { error: "Todos os campos são obrigatórios" }
  if (password.length < 6) return { error: "Senha deve ter ao menos 6 caracteres" }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: "Este email já está cadastrado" }

  const hashed = hashPassword(password)
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  })

  await createSession({ userId: user.id, name: user.name, email: user.email })
  redirect("/dashboard")
}

export async function logout() {
  await deleteSession()
  redirect("/login")
}
