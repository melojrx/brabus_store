import { NextResponse } from "next/server"
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client"
import Stripe from "stripe"
import { headers } from "next/headers"
import prisma from "@/lib/prisma"
import { getStripeServerClient } from "@/lib/stripe"

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

async function markOrderPaid(
  tx: Prisma.TransactionClient,
  session: Stripe.Checkout.Session,
  orderId: string,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })

  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }

  if (order.paymentStatus === PaymentStatus.PAID) {
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
      status: order.status === OrderStatus.PENDING ? OrderStatus.PAID : order.status,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod:
        session.payment_method_types?.length === 1 && session.payment_method_types[0] === "pix"
          ? PaymentMethod.STRIPE_PIX
          : PaymentMethod.STRIPE_CARD,
      paidAt: order.paidAt ?? new Date(),
      stripePaymentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
    },
  })

  return "paid"
}

async function markOrderStatusBySession(session: Stripe.Checkout.Session, status: OrderStatus) {
  const orderId = session.client_reference_id

  if (!orderId) {
    throw new Error("No client_reference_id in session")
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      paymentStatus:
        status === OrderStatus.FAILED
          ? PaymentStatus.FAILED
          : status === OrderStatus.CANCELLED
            ? PaymentStatus.CANCELLED
            : undefined,
    },
  })

  return orderId
}

export async function POST(req: Request) {
  const reqBody = await req.text()
  const reqHeaders = await headers()
  const sig = reqHeaders.get("stripe-signature")

  let event: Stripe.Event

  try {
    if (!sig || !endpointSecret) {
      throw new Error("Missing stripe signature or endpoint secret")
    }

    const stripe = getStripeServerClient()
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

        if (session.payment_status !== "paid") {
          console.log(`Checkout session ${session.id} completed with payment_status=${session.payment_status}. Waiting for async confirmation.`)
          break
        }

        const transactionResult = await prisma.$transaction((tx) => markOrderPaid(tx, session, orderId))

        if (transactionResult === "already-paid") {
          console.warn(`Order ${orderId} is already PAID. Skipping.`)
          break
        }

        console.log(`Order ${orderId} PAID and stock updated.`)
        break
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.client_reference_id

        if (!orderId) {
          throw new Error("No client_reference_id in session")
        }

        const transactionResult = await prisma.$transaction((tx) => markOrderPaid(tx, session, orderId))

        if (transactionResult === "already-paid") {
          console.warn(`Order ${orderId} is already PAID. Skipping async success.`)
          break
        }

        console.log(`Order ${orderId} PAID after async confirmation.`)
        break
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = await markOrderStatusBySession(session, OrderStatus.FAILED)
        console.log(`Order ${orderId} FAILED after async payment failure.`)
        break
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = await markOrderStatusBySession(session, OrderStatus.CANCELLED)
        console.log(`Order ${orderId} CANCELLED after checkout session expiration.`)
        break
      }

      case "payment_intent.payment_failed": {
        const stripe = getStripeServerClient()
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        const sessionList = await stripe.checkout.sessions.list({ payment_intent: paymentIntent.id, limit: 1 })
        if (sessionList.data.length > 0) {
          const session = sessionList.data[0]
          const orderId = await markOrderStatusBySession(session, OrderStatus.FAILED)
          console.log(`Order ${orderId} FAILED after payment_intent failure.`)
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
