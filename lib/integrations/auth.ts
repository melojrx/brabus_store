import { createHash, randomBytes } from "node:crypto"
import prisma from "@/lib/prisma"

export type IntegrationAuthContext = {
  apiKeyId: string
  actor: string
  scopes: string[]
}

export class IntegrationAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "IntegrationAuthError"
  }
}

export function generateApiKey(): string {
  const prefix = process.env.NODE_ENV === "production" ? "brb_live_" : "brb_test_"
  return `${prefix}${randomBytes(32).toString("hex")}`
}

export function hashApiKey(rawKey: string): string {
  const pepper = process.env.INTEGRATION_API_KEY_PEPPER ?? ""
  return createHash("sha256").update(`${pepper}${rawKey}`).digest("hex")
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization")

  if (!header || !header.startsWith("Bearer ")) {
    return null
  }

  const token = header.slice(7).trim()
  return token.length > 0 ? token : null
}

export function hasScope(ctx: IntegrationAuthContext, scope: string): boolean {
  return ctx.scopes.includes(scope)
}

export async function requireIntegrationAuth(req: Request): Promise<IntegrationAuthContext> {
  const token = getBearerToken(req)

  if (!token) {
    throw new IntegrationAuthError("UNAUTHORIZED", "Missing or invalid Authorization header.", 401)
  }

  const keyHash = hashApiKey(token)

  const apiKey = await prisma.integrationApiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      actor: true,
      scopes: true,
      active: true,
      revokedAt: true,
    },
  })

  if (!apiKey || !apiKey.active || apiKey.revokedAt) {
    throw new IntegrationAuthError("UNAUTHORIZED", "Invalid or revoked API key.", 401)
  }

  prisma.integrationApiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {})

  return {
    apiKeyId: apiKey.id,
    actor: apiKey.actor,
    scopes: apiKey.scopes,
  }
}

export async function requireIntegrationScope(
  req: Request,
  scope: string,
): Promise<IntegrationAuthContext> {
  const ctx = await requireIntegrationAuth(req)

  if (!hasScope(ctx, scope)) {
    throw new IntegrationAuthError(
      "FORBIDDEN",
      `Missing required scope: ${scope}`,
      403,
    )
  }

  return ctx
}
