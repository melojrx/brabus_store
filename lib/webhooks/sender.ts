import prisma from "@/lib/prisma"

const TIMEOUT_MS = 10_000
const MAX_ATTEMPTS = 3
const BACKOFF_SECONDS = [60, 300, 1800]

type SendInput = {
  deliveryId: string
  url: string
  secret: string
  payload: unknown
  event: string
}

export async function sendWebhook(input: SendInput): Promise<boolean> {
  const { deliveryId, url, secret, payload, event } = input
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let httpStatus: number | null = null
  let responseBody: string | null = null
  let success = false

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`,
        "X-Webhook-Event": event,
        "X-Webhook-Delivery-Id": deliveryId,
        "User-Agent": "BrabusStore-Webhook/1.0",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    httpStatus = response.status
    responseBody = await response.text().catch(() => null)
    success = response.ok
  } catch (error) {
    responseBody = error instanceof Error ? error.message : "Unknown error"
  } finally {
    clearTimeout(timer)
  }

  const delivery = await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      httpStatus,
      responseBody: responseBody?.slice(0, 2000) ?? null,
      success,
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
    },
    select: { attempts: true },
  })

  if (!success && delivery.attempts < MAX_ATTEMPTS) {
    const backoffMs = (BACKOFF_SECONDS[delivery.attempts - 1] ?? 1800) * 1000
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { nextRetryAt: new Date(Date.now() + backoffMs) },
    })
  } else if (!success) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { nextRetryAt: null },
    })
  }

  return success
}

export { MAX_ATTEMPTS }
