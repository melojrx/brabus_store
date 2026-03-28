import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Truck } from "lucide-react"
import { getOrderDisplayNumber } from "@/lib/order-number"
import prisma from "@/lib/prisma"

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: "Aguardando Pagamento", cls: "bg-yellow-500/20 text-yellow-400" },
  PAID:      { label: "Pago",                 cls: "bg-green-500/20 text-green-400" },
  SHIPPED:   { label: "Enviado",              cls: "bg-blue-500/20 text-blue-400" },
  DELIVERED: { label: "Entregue",             cls: "bg-emerald-500/20 text-emerald-400" },
  CANCELLED: { label: "Cancelado",            cls: "bg-red-500/20 text-red-400" },
  REFUNDED:  { label: "Reembolsado",          cls: "bg-purple-500/20 text-purple-400" },
  FAILED:    { label: "Falhou",               cls: "bg-red-500/20 text-red-400" },
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  const { id } = await params

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id as string },
    include: {
      items: {
        include: { product: { select: { name: true, images: true, slug: true } } },
      },
    },
  })

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-heading mb-4">Pedido não encontrado</h1>
        <Link href="/account/orders" className="text-[var(--color-primary)] hover:underline">
          Voltar para meus pedidos
        </Link>
      </div>
    )
  }

  const status = STATUS_LABELS[order.status] ?? { label: order.status, cls: "bg-gray-500/20 text-gray-400" }
  const subtotal = order.items.reduce((acc, item) => acc + (item.unitPrice ?? item.price).toNumber() * item.quantity, 0)
  const displayOrderNumber = getOrderDisplayNumber(order)

  return (
    <div className="container mx-auto px-4 py-12 lg:py-20 max-w-3xl">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Meus Pedidos
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-white/10">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-1">Pedido {displayOrderNumber}</p>
          <p className="text-sm text-gray-400">
            {new Date(order.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm self-start ${status.cls}`}>
          {status.label}
        </span>
      </div>

      {/* Itens */}
      <div className="bg-zinc-900 border border-white/5 rounded-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-heading tracking-wider uppercase text-sm">Itens do Pedido</h2>
        </div>
        <div className="divide-y divide-white/5">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-6 py-4">
              <div className="w-14 h-14 bg-white/5 rounded-sm overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.product.images[0] || "/placeholder.jpg"}
                  alt={item.productNameSnapshot || item.product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{item.productNameSnapshot || item.product.name}</p>
                <div className="flex gap-3 mt-0.5">
                  {item.variantNameSnapshot && item.variantNameSnapshot !== "Default" && (
                    <span className="text-xs text-gray-400">Variação: {item.variantNameSnapshot}</span>
                  )}
                  {item.selectedFlavor && (
                    <span className="text-xs text-gray-400">Sabor: {item.selectedFlavor}</span>
                  )}
                  {item.selectedSize && (
                    <span className="text-xs text-gray-400">Tam: {item.selectedSize}</span>
                  )}
                  {item.selectedColor && (
                    <span className="text-xs text-gray-400">Cor: {item.selectedColor}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Qtd: {item.quantity}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-heading tracking-wider">
                  R$ {((item.unitPrice ?? item.price).toNumber() * item.quantity).toFixed(2).replace(".", ",")}
                </p>
                <p className="text-xs text-gray-500">
                  R$ {(item.unitPrice ?? item.price).toNumber().toFixed(2).replace(".", ",")} / un
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Resumo */}
        <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
          <h2 className="font-heading tracking-wider uppercase text-sm mb-4">Resumo</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                {order.shippingCarrier ?? "Frete"}
                {order.shippingDeadline && (
                  <span className="text-[10px] text-gray-500">({order.shippingDeadline})</span>
                )}
              </span>
              <span>R$ {order.shippingCost.toNumber().toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between font-bold text-white pt-3 border-t border-white/10 text-base">
              <span>Total</span>
              <span className="font-heading tracking-wider text-lg">
                R$ {order.total.toNumber().toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </div>

        {/* Endereço */}
        {order.shippingType !== "PICKUP" && order.addressStreet && (
          <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
            <h2 className="font-heading tracking-wider uppercase text-sm mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-primary)]" /> Endereço de Entrega
            </h2>
            <address className="not-italic text-sm text-gray-400 space-y-1">
              <p>{order.addressStreet}{order.addressNumber ? `, ${order.addressNumber}` : ""}</p>
              {order.addressComplement && <p>{order.addressComplement}</p>}
              {order.addressNeighborhood && <p>{order.addressNeighborhood}</p>}
              <p>{order.addressCity} – {order.addressState}</p>
              {order.addressZip && <p>CEP {order.addressZip}</p>}
            </address>
          </div>
        )}

        {order.shippingType === "PICKUP" && (
          <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
            <h2 className="font-heading tracking-wider uppercase text-sm mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-primary)]" /> Retirada na Loja
            </h2>
            <p className="text-sm text-gray-400">Rua Antônio Lopes, 571 — Aracoiaba, CE</p>
          </div>
        )}
      </div>
    </div>
  )
}
