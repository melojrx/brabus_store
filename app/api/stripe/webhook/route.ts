import { NextResponse } from "next/server"
import { OrderStatus } from "@prisma/client"
import Stripe from "stripe"
import { headers } from "next/headers"
import prisma from "@/lib/prisma"
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2024-09-30.acacia" as any })
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: Request) {
  const reqBody = await req.text()
  const reqHeaders = await headers()
  const sig = reqHeaders.get("stripe-signature")

  let event: Stripe.Event

  try {
    if (!sig || !endpointSecret) {
      throw new Error("Missing stripe signature or endpoint secret")
    }

    event = stripe.webhooks.constructEvent(reqBody, sig, endpointSecret)
  } catch (error: any) {
    console.error("Webhook signature verification failed.", error.message)
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.client_reference_id

        if (!orderId) {
          throw new Error("No client_reference_id in session")
        }

        const transactionResult = await prisma.$transaction(async (tx) => {
          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true },
          })

          if (!order) {
            throw new Error(`Order ${orderId} not found`)
          }

          if (order.status === OrderStatus.PAID) {
            return "already-paid"
          }

          for (const item of order.items) {
            if (!item.productVariantId) {
              throw new Error(`Order item ${item.id} is missing productVariantId`)
            }

            const updatedVariant = await tx.productVariant.updateMany({
              where: {
                id: item.productVariantId,
                productId: item.productId,
                stock: { gte: item.quantity },
              },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            })

            if (updatedVariant.count === 0) {
              throw new Error(`Insufficient variant stock for order item ${item.id}`)
            }

          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.PAID,
              stripePaymentId: (session.payment_intent as string) || null,
            },
          })

          return "paid"
        })

        if (transactionResult === "already-paid") {
          console.warn(`Order ${orderId} is already PAID. Skipping.`)
          break
        }

        console.log(`Order ${orderId} PAID and stock updated.`)
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        const sessionList = await stripe.checkout.sessions.list({ payment_intent: paymentIntent.id, limit: 1 })
        if (sessionList.data.length > 0) {
          const session = sessionList.data[0]
          const orderId = session.client_reference_id

          if (orderId) {
            await prisma.order.update({
              where: { id: orderId },
              data: { status: OrderStatus.FAILED },
            })
            console.log(`Order ${orderId} FAILED. Stock untouched.`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Erro interno no processamento do webhook:", error)
    return NextResponse.json({ error: "Internal Error updating DB" }, { status: 500 })
  }
}
