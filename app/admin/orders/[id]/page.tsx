import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, MapPin, Truck, User } from "lucide-react"
import OrderAdminActions from "@/app/admin/orders/[id]/OrderAdminActions"
import { getAdminOrderDetail } from "@/lib/admin-orders"
import { PDV_WALK_IN_CUSTOMER_EMAIL } from "@/lib/pdv"
import { getOrderStatusMeta } from "@/lib/order-status"
import { getPaymentMethodLabel, getPaymentStatusMeta } from "@/lib/payment-status"
import prisma from "@/lib/prisma"
import { getPublicStoreSettings } from "@/lib/store-settings"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatDateTime(value: Date | string | null) {
  if (!value) {
    return "Não confirmado"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value)
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session || session.user?.role !== "ADMIN") {
    redirect("/")
  }

  const { id } = await params

  const [order, storeSettings] = await Promise.all([
    getAdminOrderDetail(prisma, id),
    getPublicStoreSettings(),
  ])

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-heading mb-4">Pedido não encontrado</h1>
        <Link href="/admin/orders" className="text-[var(--color-primary)] hover:underline">
          Voltar para pedidos
        </Link>
      </div>
    )
  }

  const status = getOrderStatusMeta(order.status)
  const paymentStatus = getPaymentStatusMeta(order.paymentStatus)
  const subtotal = order.items.reduce((acc, item) => acc + (item.unitPrice ?? item.price).toNumber() * item.quantity, 0)
  const customerName = order.customerNameSnapshot ?? order.user.name
  const customerEmail =
    order.customerEmailSnapshot ??
    (order.user.email === PDV_WALK_IN_CUSTOMER_EMAIL ? "Não informado" : order.user.email)
  const customerPhone = order.customerPhoneSnapshot ?? order.user.phone

  return (
    <div className="max-w-5xl space-y-8">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold"
      >
        <ArrowLeft className="w-4 h-4" /> Pedidos
      </Link>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-8 border-b border-white/10">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-2">Pedido #{order.id.split("-")[0].toUpperCase()}</p>
          <h1 className="text-3xl font-heading tracking-wider uppercase text-white">Detalhes do Pedido</h1>
          <p className="text-sm text-gray-400 mt-2">
            {new Date(order.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm self-start ${status.outlinedClassName}`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
          <h2 className="font-heading tracking-wider uppercase text-sm mb-4">Cliente</h2>
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2 text-white">
              <User className="w-4 h-4 text-[var(--color-primary)]" /> {customerName}
            </p>
            <p className="flex items-center gap-2 text-gray-400">
              <Mail className="w-4 h-4 text-[var(--color-primary)]" /> {customerEmail}
            </p>
            {customerPhone && (
              <p className="text-gray-400">Telefone: {customerPhone}</p>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
          <h2 className="font-heading tracking-wider uppercase text-sm mb-4">Resumo</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                {order.shippingCarrier ?? "Frete"}
              </span>
              <span>{formatCurrency(order.shippingCost.toNumber())}</span>
            </div>
            <div className="flex justify-between font-bold text-white pt-3 border-t border-white/10 text-base">
              <span>Total</span>
              <span className="font-heading tracking-wider">{formatCurrency(order.total.toNumber())}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
          <h2 className="font-heading tracking-wider uppercase text-sm mb-4">Entrega</h2>
          {order.shippingType === "PICKUP" ? (
            <p className="text-sm text-gray-400">Retirada em loja. Rua Antônio Lopes, 571 — Aracoiaba, CE.</p>
          ) : (
            <div className="space-y-4 text-sm text-gray-400">
              <address className="not-italic space-y-1">
                <p className="flex items-center gap-2 text-white">
                  <MapPin className="w-4 h-4 text-[var(--color-primary)]" /> {order.addressStreet}
                  {order.addressNumber ? `, ${order.addressNumber}` : ""}
                </p>
                {order.addressComplement && <p>{order.addressComplement}</p>}
                {order.addressNeighborhood && <p>{order.addressNeighborhood}</p>}
                <p>
                  {order.addressCity} - {order.addressState}
                </p>
                {order.addressZip && <p>CEP {order.addressZip}</p>}
              </address>

              <div className="space-y-1 border-t border-white/10 pt-4">
                <p>Transportadora: {order.shippingCarrier ?? "Não informada"}</p>
                {order.shippingDeadline && <p>Prazo: {order.shippingDeadline}</p>}
                <p>Rastreio: {order.trackingCode ?? "Não informado"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading tracking-wider uppercase text-sm text-white">Pagamento</h2>
            <p className="mt-2 text-sm text-gray-500">
              Visão consolidada para caixa, conferência e operação de pedidos pagos manualmente.
            </p>
          </div>
          <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm ${paymentStatus.outlinedClassName}`}>
            {paymentStatus.label}
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <span className="text-gray-500">Método</span>
              <span className="text-right text-white">{getPaymentMethodLabel(order.paymentMethod)}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <span className="text-gray-500">Situação</span>
              <span className="text-right text-white">{paymentStatus.label}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <span className="text-gray-500">Confirmado em</span>
              <span className="text-right text-white">{formatDateTime(order.paidAt)}</span>
            </div>
            {order.paymentInstallments != null && (
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-gray-500">Parcelamento</span>
                <span className="text-right text-white">{order.paymentInstallments}x</span>
              </div>
            )}
            {order.stripePaymentId && (
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-gray-500">Pagamento Stripe</span>
                <span className="break-all text-right text-white">{order.stripePaymentId}</span>
              </div>
            )}
            {order.manualPaymentReference && (
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-gray-500">Referência</span>
                <span className="text-right text-white">{order.manualPaymentReference}</span>
              </div>
            )}
            {order.cashReceivedAmount != null && (
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-gray-500">Valor Recebido</span>
                <span className="text-right text-white">{formatCurrency(order.cashReceivedAmount.toNumber())}</span>
              </div>
            )}
            {order.changeAmount != null && (
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
                <span className="text-gray-500">Troco</span>
                <span className="text-right text-white">{formatCurrency(order.changeAmount.toNumber())}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {(order.paymentMethod === "MANUAL_PIX" ||
              order.paymentMethod === "POS_DEBIT" ||
              order.paymentMethod === "POS_CREDIT") && (
              <div className="rounded-sm border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-4 py-4 text-sm text-gray-200">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  {order.paymentMethod === "MANUAL_PIX" ? "Chave Pix da Loja" : "Referência Operacional"}
                </p>
                <p className="mt-2 break-all font-mono text-xs text-white">
                  {order.paymentMethod === "MANUAL_PIX"
                    ? storeSettings.pixKey ?? "Não cadastrada no admin."
                    : order.manualPaymentReference ?? "Nenhuma referência registrada."}
                </p>
              </div>
            )}

            <div className="rounded-sm border border-white/5 bg-black/30 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Notas Operacionais</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">
                {order.manualPaymentNotes ?? "Nenhuma observação registrada para este pagamento."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <OrderAdminActions
        orderId={order.id}
        currentStatus={order.status}
        currentPaymentMethod={order.paymentMethod}
        currentPaymentStatus={order.paymentStatus}
        initialTrackingCode={order.trackingCode}
        initialManualPaymentReference={order.manualPaymentReference}
        initialManualPaymentNotes={order.manualPaymentNotes}
        initialCashReceivedAmount={order.cashReceivedAmount?.toNumber() ?? null}
        initialChangeAmount={order.changeAmount?.toNumber() ?? null}
        initialPaymentInstallments={order.paymentInstallments}
        orderTotal={order.total.toNumber()}
        pixKey={storeSettings.pixKey}
      />

      <div className="bg-zinc-900 border border-white/5 rounded-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-heading tracking-wider uppercase text-sm">Itens do Pedido</h2>
        </div>
        <div className="divide-y divide-white/5">
          {order.items.map((item) => (
            <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-4 px-6 py-5">
              <div className="w-16 h-16 bg-white/5 rounded-sm overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.product.images[0] || "/placeholder.jpg"}
                  alt={item.productNameSnapshot || item.product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{item.productNameSnapshot || item.product.name}</p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                  {item.variantNameSnapshot && item.variantNameSnapshot !== "Default" && <span>Variação: {item.variantNameSnapshot}</span>}
                  {item.selectedSize && <span>Tam: {item.selectedSize}</span>}
                  {item.selectedColor && <span>Cor: {item.selectedColor}</span>}
                  {item.selectedFlavor && <span>Sabor: {item.selectedFlavor}</span>}
                </div>
                <p className="text-xs text-gray-500 mt-2">Qtd: {item.quantity}</p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-heading tracking-wider text-white">
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
    </div>
  )
}
