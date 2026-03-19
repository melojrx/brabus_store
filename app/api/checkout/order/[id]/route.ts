import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCheckoutOrderSummary } from "@/lib/manual-orders"
import prisma from "@/lib/prisma"
import { getPublicStoreSettings } from "@/lib/store-settings"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const [order, storeSettings] = await Promise.all([
      getCheckoutOrderSummary(prisma, { orderId: id, userId }),
      getPublicStoreSettings(),
    ])

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
    }

    return NextResponse.json({
      source: "manual",
      whatsapp: storeSettings.whatsapp,
      pixKey: storeSettings.pixKey,
      order,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Não foi possível consultar o pedido." },
      { status: 400 },
    )
  }
}
