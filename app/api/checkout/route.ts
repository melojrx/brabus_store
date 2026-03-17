import { NextResponse } from "next/server"
import { PrismaClient, ShippingType } from "@prisma/client"
import Stripe from "stripe"
import { auth } from "@/auth"

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2024-09-30.acacia" as any })

export async function POST(req: Request) {
  try {
    const sessionAuth = await auth()
    const userId = sessionAuth?.user?.id

    if (!userId) {
      return NextResponse.json({ error: "Você precisa estar logado para finalizar a compra." }, { status: 401 })
    }

    const body = await req.json()
    const { items, shippingType, shippingCost = 0, shippingCarrier, shippingDeadline, address } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Carrinho está vazio." }, { status: 400 })
    }

    // Validação de Estoque
    let total = 0
    const orderItemsRecord: any[] = []

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } })
      if (!product) {
        return NextResponse.json({ error: `Produto ${item.productId} não encontrado.` }, { status: 404 })
      }
      if (item.quantity > product.stock) {
        return NextResponse.json({ error: `Estoque insuficiente para o produto: ${product.name}. Disponível: ${product.stock}` }, { status: 400 })
      }
      
      const priceToUse = product.price.toNumber()
      total += priceToUse * item.quantity

      orderItemsRecord.push({
        productId: product.id,
        quantity: item.quantity,
        price: priceToUse,
        selectedSize: item.selectedSize || null,
        selectedFlavor: item.selectedFlavor || null,
      })
    }
    
    // Adicionar frete ao total
    total += shippingCost

    const orderData = {
      userId,
      total,
      shippingType: shippingType as ShippingType,
      shippingCost,
      shippingCarrier,
      shippingDeadline,
      ...(shippingType !== 'PICKUP' ? address : {})
    }

    // Criar o pedido (PENDING)
    const order = await prisma.order.create({
      data: {
        ...orderData,
        items: {
          create: orderItemsRecord
        }
      }
    })

    // Montar os Line Items para o Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'brl',
        product_data: {
          name: item.productName,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }))

    // Adiciona o Frete como item no Stripe
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'brl',
          product_data: { name: 'Custo de Envio (' + shippingCarrier + ')' },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      })
    }

    // Criar Stripe Session
    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'pix', 'boleto'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      client_reference_id: order.id, // Armazena a ref. do nosso pedido interno
    })

    // Salvar session id temporário
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: stripeSession.id }
    })

    return NextResponse.json({ sessionId: stripeSession.id, url: stripeSession.url })
  } catch (error) {
    console.error("Erro no checkout:", error)
    return NextResponse.json({ error: "Erro ao processar checkout" }, { status: 500 })
  }
}
