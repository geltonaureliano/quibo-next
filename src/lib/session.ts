import { cookies } from "next/headers"
import crypto from "node:crypto"

const SESSION_COOKIE = "qb_session"
const SECRET = process.env.SESSION_SECRET ?? "quibo-super-secret-2026-dev-key!!"

export interface SessionPayload {
  userId: string
  name: string
  email: string
}

function sign(payload: SessionPayload): string {
  const data = JSON.stringify({ ...payload, iat: Date.now() })
  const encoded = Buffer.from(data).toString("base64url")
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(encoded)
    .digest("base64url")
  return `${encoded}.${sig}`
}

function verify(token: string): SessionPayload | null {
  try {
    const [encoded, sig] = token.split(".")
    if (!encoded || !sig) return null

    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(encoded)
      .digest("base64url")

    const sigBuf = Buffer.from(sig, "base64url")
    const expBuf = Buffer.from(expected, "base64url")
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf))
      return null

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"))
    const maxAge = 7 * 24 * 60 * 60 * 1000
    if (!payload.iat || Date.now() - payload.iat > maxAge) return null

    return { userId: payload.userId, name: payload.name, email: payload.email }
  } catch {
    return null
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = sign(payload)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verify(token)
}

export async function deleteSession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
