"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Banknote,
  CheckCircle,
  LoaderCircle,
  MessageCircle,
  QrCode,
  TimerReset,
} from "lucide-react"
import type { PaymentMethodValue, PaymentStatusValue } from "@/lib/payment-status"
import { useCartStore } from "@/store/cartStore"
import { getPaymentMethodLabel, getPaymentStatusMeta } from "@/lib/payment-status"

type CheckoutOrderSummary = {
  id: string
  status: string
  paymentMethod: string
  paymentStatus: string
  total: number
  customerName: string | null
  shippingType: string
  shippingCarrier: string | null
  shippingDeadline: string | null
  cashReceivedAmount: number | null
  changeAmount: number | null
  createdAt: string
  items: Array<{
    quantity: number
    productName: string
    variantLabel: string | null
    displayLabel: string
  }>
}

type StripeCheckoutSummary = {
  source: "stripe"
  id: string
  status: string | null
  paymentStatus: string | null
  whatsapp: string
  order: CheckoutOrderSummary | null
}

type ManualCheckoutSummary = {
  source: "manual"
  whatsapp: string
  pixKey: string | null
  order: CheckoutOrderSummary
}

type CheckoutSummary = StripeCheckoutSummary | ManualCheckoutSummary
type CheckoutSummaryResponse = CheckoutSummary | { error?: string }

function formatCurrency(value: number | null | undefined) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0
  return `R$ ${safeValue.toFixed(2).replace(".", ",")}`
}

function buildSuccessCopy(summary: CheckoutSummary | null) {
  if (!summary?.order) {
    return {
      title: "Pedido Recebido",
      description:
        "Seu pedido foi criado e está aguardando a confirmação final do pagamento no Stripe.",
      icon: TimerReset,
    }
  }

  if (summary.order.paymentMethod === "MANUAL_PIX") {
    return {
      title: "Pedido Recebido",
      description:
        "Seu pedido foi registrado e está aguardando a confirmação manual do Pix pela equipe da loja.",
      icon: TimerReset,
    }
  }

  if (summary.order.paymentMethod === "CASH") {
    return {
      title: "Pedido Recebido",
      description:
        "Seu pedido foi registrado para pagamento em dinheiro na retirada ou na entrega local.",
      icon: TimerReset,
    }
  }

  if (
    summary.order.status === "PAID" ||
    summary.order.paymentStatus === "PAID" ||
    (summary.source === "stripe" && summary.paymentStatus === "paid")
  ) {
    return {
      title: "Pagamento Aprovado",
      description:
        "Seu pagamento foi confirmado e o pedido já entrou na fila de separação.",
      icon: CheckCircle,
    }
  }

  return {
    title: "Pedido Recebido",
    description:
      "Seu checkout foi concluído, mas o pagamento ainda está em processamento. Isso é esperado para métodos como Pix e boleto até o webhook confirmar.",
    icon: TimerReset,
  }
}

function getShippingLabel(order: CheckoutOrderSummary) {
  if (order.shippingType === "PICKUP") {
    return "Retirada na Loja"
  }

  if (order.shippingType === "LOCAL_DELIVERY") {
    return order.shippingCarrier?.trim() || "Entrega Local"
  }

  if (order.shippingType === "NATIONAL") {
    return order.shippingCarrier?.trim()
      ? `Entrega Nacional (${order.shippingCarrier.trim()})`
      : "Entrega Nacional"
  }

  return order.shippingCarrier?.trim() || "Entrega"
}

function buildWhatsappOrderMessage(summary: CheckoutSummary | null) {
  const order = summary?.order

  if (!order) {
    return "Olá! Acabei de finalizar um pedido no site e gostaria de acompanhamento."
  }

  const customerName = order.customerName?.trim() || "cliente"
  const shortOrderId = `#${order.id.split("-")[0].toUpperCase()}`
  const productLines = order.items.length > 0
    ? order.items
        .map((item) => `- ${item.quantity}x ${item.displayLabel}`)
    : ["- itens do pedido"]
  const paymentMethodLabel = getPaymentMethodLabel(order.paymentMethod as PaymentMethodValue)
  const shippingLabel = getShippingLabel(order)
  const paymentApproved =
    order.status === "PAID" ||
    order.paymentStatus === "PAID" ||
    (summary?.source === "stripe" && summary.paymentStatus === "paid")
  const baseLines = [
    `Olá, ${customerName}!`,
    paymentApproved
      ? `Seu pagamento do pedido ${shortOrderId} foi aprovado.`
      : `Seu pedido ${shortOrderId} foi recebido.`,
    "",
    "Produtos:",
    ...productLines,
    `Valor total: ${formatCurrency(order.total)}`,
    `Forma de pagamento: ${paymentMethodLabel}`,
    `Entrega: ${shippingLabel}`,
  ]

  if (paymentApproved) {
    return baseLines.join("\n")
  }

  if (order.paymentMethod === "MANUAL_PIX") {
    return [...baseLines, "", "Estou enviando o comprovante para confirmação."].join("\n")
  }

  if (order.paymentMethod === "CASH") {
    return [...baseLines, "", "Quero alinhar o pagamento em dinheiro."].join("\n")
  }

  return baseLines.join("\n")
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const orderId = searchParams.get("order_id")
  const { clearCart } = useCartStore()
  const [summary, setSummary] = useState<CheckoutSummary | null>(null)
  const [loading, setLoading] = useState(Boolean(sessionId || orderId))
  const [error, setError] = useState("")

  useEffect(() => {
    clearCart()
  }, [clearCart])

  useEffect(() => {
    if (!sessionId && !orderId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadSummary() {
      try {
        const endpoint = orderId
          ? `/api/checkout/order/${orderId}`
          : `/api/checkout/session/${sessionId}`
        const response = await fetch(endpoint, {
          cache: "no-store",
        })
        const data = (await response.json()) as CheckoutSummaryResponse

        if (!response.ok || "error" in data) {
          throw new Error(("error" in data && data.error) || "Não foi possível consultar o checkout.")
        }

        if (!cancelled) {
          setSummary(data as CheckoutSummary)
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Não foi possível consultar o checkout.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadSummary()

    return () => {
      cancelled = true
    }
  }, [orderId, sessionId])

  const copy = buildSuccessCopy(summary)
  const StatusIcon = copy.icon
  const order = summary?.order ?? null
  const paymentStatusMeta =
    order && ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"].includes(order.paymentStatus)
      ? getPaymentStatusMeta(order.paymentStatus as PaymentStatusValue)
      : null
  const whatsappNumber = summary?.whatsapp ?? "5585997839040"
  const whatsappMessage = buildWhatsappOrderMessage(summary)

  return (
    <div className="container mx-auto px-4 py-20 min-h-[70vh] flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center mb-8">
        {loading ? (
          <LoaderCircle className="w-12 h-12 text-[var(--color-primary)] animate-spin" />
        ) : (
          <StatusIcon className="w-12 h-12 text-[var(--color-primary)]" />
        )}
      </div>

      <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-6">
        {copy.title.split(" ").slice(0, -1).join(" ")}{" "}
        <span className="text-[var(--color-primary)]">{copy.title.split(" ").slice(-1)}</span>
      </h1>

      <p className="text-gray-400 mb-4 max-w-2xl mx-auto">{copy.description}</p>

      {order ? (
        <div className="mb-10 grid gap-4 sm:grid-cols-3 w-full max-w-4xl">
          <div className="rounded-sm border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-widest text-gray-500">Pedido</p>
            <p className="mt-2 text-sm font-bold text-white">#{order.id.split("-")[0].toUpperCase()}</p>
          </div>
          <div className="rounded-sm border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-widest text-gray-500">Pagamento</p>
            <p className="mt-2 text-sm font-bold text-white">{getPaymentMethodLabel(order.paymentMethod as PaymentMethodValue)}</p>
          </div>
          <div className="rounded-sm border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-widest text-gray-500">Total</p>
            <p className="mt-2 text-sm font-bold text-white">{formatCurrency(order.total)}</p>
          </div>
        </div>
      ) : null}

      {order && paymentStatusMeta ? (
        <span className={`mb-8 inline-flex rounded-sm px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${paymentStatusMeta.outlinedClassName}`}>
          {paymentStatusMeta.label}
        </span>
      ) : null}

      {summary?.source === "manual" && order?.paymentMethod === "MANUAL_PIX" && summary.pixKey ? (
        <div className="mb-10 w-full max-w-2xl rounded-sm border border-white/10 bg-black/20 p-6 text-left">
          <div className="flex items-center gap-3 text-[var(--color-primary)]">
            <QrCode className="w-5 h-5" />
            <p className="text-sm font-bold uppercase tracking-widest">Chave Pix da Loja</p>
          </div>
          <p className="mt-4 break-all text-base text-white">{summary.pixKey}</p>
          <p className="mt-4 text-sm text-gray-400">
            Envie o comprovante pelo WhatsApp para agilizar a confirmação do pagamento.
          </p>
        </div>
      ) : null}

      {order?.paymentMethod === "CASH" ? (
        <div className="mb-10 w-full max-w-2xl rounded-sm border border-white/10 bg-black/20 p-6 text-left">
          <div className="flex items-center gap-3 text-[var(--color-primary)]">
            <Banknote className="w-5 h-5" />
            <p className="text-sm font-bold uppercase tracking-widest">Pagamento em Dinheiro</p>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            O pagamento será concluído na retirada ou na entrega local. Se quiser, confirme pelo WhatsApp para acelerar o atendimento.
          </p>
          {order.cashReceivedAmount != null ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-sm border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-widest text-gray-500">Valor em mãos</p>
                <p className="mt-2 text-white">{formatCurrency(order.cashReceivedAmount)}</p>
              </div>
              <div className="rounded-sm border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-widest text-gray-500">Troco estimado</p>
                <p className="mt-2 text-white">{formatCurrency(order.changeAmount)}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mb-8 text-sm text-red-400">{error}</p> : null}

      <div className="flex flex-col sm:flex-row gap-4 mb-12">
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" /> Falar no WhatsApp
        </a>
        <Link href="/account/orders" className="glass hover:bg-white/10 text-white font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center">
          Ver Meus Pedidos
        </Link>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-20">
          <div className="rounded-sm border border-white/10 bg-black/40 px-8 py-6 text-center text-sm text-gray-400">
            Carregando confirmação do pedido...
          </div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}
