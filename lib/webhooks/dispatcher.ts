import prisma from "@/lib/prisma"
import type { WebhookEventType, WebhookEventDataMap, WebhookPayload } from "./events"
import { sendWebhook } from "./sender"

function generateEventId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `evt_${timestamp}${random}`
}

export async function dispatchWebhookEvent<T extends WebhookEventType>(
  event: T,
  data: WebhookEventDataMap[T],
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      active: true,
      events: { has: event },
    },
    select: {
      id: true,
      url: true,
      secret: true,
    },
  })

  if (endpoints.length === 0) return

  const payload: WebhookPayload<T> = {
    id: generateEventId(),
    event,
    createdAt: new Date().toISOString(),
    data,
  }

  const deliveryPromises = endpoints.map(async (endpoint) => {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        event,
        payload: payload as unknown as object,
      },
    })

    sendWebhook({
      deliveryId: delivery.id,
      url: endpoint.url,
      secret: endpoint.secret,
      payload,
      event,
    }).catch(() => {})
  })

  await Promise.allSettled(deliveryPromises)
}
