import crypto from "node:crypto"

const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60

export function createPasswordResetTokenPair() {
  const rawToken = crypto.randomBytes(32).toString("hex")

  return {
    rawToken,
    tokenHash: hashPasswordResetToken(rawToken),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
  }
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function buildPasswordResetUrl(requestUrl: string, rawToken: string) {
  const baseUrl = process.env.NEXTAUTH_URL || new URL(requestUrl).origin
  const url = new URL("/auth/reset-password", baseUrl)
  url.searchParams.set("token", rawToken)
  return url.toString()
}
