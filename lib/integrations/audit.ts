import prisma from "@/lib/prisma"

type AuditLogInput = {
  apiKeyId?: string | null
  actor: string
  action: string
  resourceType?: string | null
  resourceId?: string | null
  payload?: unknown
  result: string
  errorCode?: string | null
  errorMessage?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export function logIntegrationAudit(input: AuditLogInput): void {
  prisma.integrationAuditLog
    .create({
      data: {
        apiKeyId: input.apiKeyId ?? null,
        actor: input.actor,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        payload: input.payload != null ? (input.payload as object) : undefined,
        result: input.result,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    })
    .catch(() => {})
}
