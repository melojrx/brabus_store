import prisma from "@/lib/prisma"
import { sendWebhook } from "./sender"

export async function retryFailedDeliveries(): Promise<{ processed: number; succeeded: number }> {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: {
      success: false,
      nextRetryAt: { lte: new Date() },
    },
    include: {
      endpoint: {
        select: {
          url: true,
          secret: true,
          active: true,
        },
      },
    },
    take: 50,
    orderBy: { nextRetryAt: "asc" },
  })

  let succeeded = 0

  for (const delivery of deliveries) {
    if (!delivery.endpoint.active) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { nextRetryAt: null },
      })
      continue
    }

    const result = await sendWebhook({
      deliveryId: delivery.id,
      url: delivery.endpoint.url,
      secret: delivery.endpoint.secret,
      payload: delivery.payload,
      event: delivery.event,
    })

    if (result) succeeded++
  }

  return { processed: deliveries.length, succeeded }
}
