import { NextResponse } from "next/server"
import { PrismaClient, OrderStatus } from "@prisma/client"
import Stripe from "stripe"
import { headers } from "next/headers"

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2024-09-30.acacia" as any })
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: Request) {
  const reqBody = await req.text()
  const reqHeaders = await headers()
  const sig = reqHeaders.get("stripe-signature")

  let event: Stripe.Event;

  try {
    if (!sig || !endpointSecret) throw new Error("Missing stripe signature or endpoint secret")
    event = stripe.webhooks.constructEvent(reqBody, sig, endpointSecret)
  } catch (error: any) {
    console.error("Webhook signature verification failed.", error.message);
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.client_reference_id

        if (!orderId) {
          throw new Error("No client_reference_id in session")
        }

        // Obtém o pedido e os itens
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true }
        })

        if (!order) throw new Error(`Order ${orderId} not found`)
        
        // Se já estava pago, ignora para evitar deduzir estoque duas vezes
        if (order.status === OrderStatus.PAID) {
          console.warn(`Order ${orderId} is already PAID. Skipping.`)
          break
        }

        // 1. Atualizar para PAID
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            stripePaymentId: session.payment_intent as string || null
          }
        })

        // 2 & 3. Decrementar estoque e validar NUNCA negativo
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          })
          
          // Correção se ficar negativo (garantia dupla)
          const updatedProd = await prisma.product.findUnique({ where: { id: item.productId } })
          if (updatedProd && updatedProd.stock < 0) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: 0 }
            })
          }
        }
        console.log(`✅ Order ${orderId} PAID and stock updated.`)
        // 4. (Gerar link do WA será tratado na UI do cliente após redirecionamento)
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Buscar a session correspondente
        const sessionList = await stripe.checkout.sessions.list({ payment_intent: paymentIntent.id, limit: 1 })
        if (sessionList.data.length > 0) {
           const session = sessionList.data[0]
           const orderId = session.client_reference_id
           
           if (orderId) {
               // 1. Atualizar para FAILED
               await prisma.order.update({
                  where: { id: orderId },
                  data: { status: OrderStatus.FAILED }
               })
               // 2. Não decrementar estoque
               console.log(`❌ Order ${orderId} FAILED. Stock untouched.`)
           }
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Erro interno no processamento do webhook:", error)
    return NextResponse.json({ error: "Internal Error updating DB" }, { status: 500 })
  }
}
