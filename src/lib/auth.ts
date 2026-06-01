import crypto from "node:crypto"

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(":")
    if (!salt || !key) return false
    const hashBuffer = crypto.scryptSync(password, salt, 64)
    const keyBuffer = Buffer.from(key, "hex")
    return crypto.timingSafeEqual(hashBuffer, keyBuffer)
  } catch {
    return false
  }
}
