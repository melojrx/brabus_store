"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle, LoaderCircle, TimerReset, XCircle } from "lucide-react"
import { getOrderDisplayNumber } from "@/lib/order-number"
import { useCartStore } from "@/store/cartStore"

type CheckoutOrderSummary = {
  id: string
  orderNumber: string | null
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED"
  total: number
}

function CheckoutSuccessContent() {
  const orderId = useSearchParams().get("order_id")
  const { clearCart } = useCartStore()
  const clearedCart = useRef(false)
  const [order, setOrder] = useState<CheckoutOrderSummary | null>(null)
  const [loading, setLoading] = useState(Boolean(orderId))
  const [error, setError] = useState("")

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }

    let cancelled = false
    let attempts = 0
    let timeoutId: number | undefined

    const loadOrder = async () => {
      try {
        const response = await fetch(`/api/checkout/order/${orderId}`, { cache: "no-store" })
        const data = await response.json() as { order?: CheckoutOrderSummary; error?: string }

        if (!response.ok || !data.order) {
          throw new Error(data.error || "Não foi possível consultar o pedido.")
        }

        if (cancelled) return

        setOrder(data.order)
        setError("")
        if (!clearedCart.current) {
          clearCart()
          clearedCart.current = true
        }

        attempts += 1
        if (data.order.paymentStatus === "PENDING" && attempts < 24) {
          timeoutId = window.setTimeout(loadOrder, 5000)
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Não foi possível consultar o pedido.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadOrder()
    return () => {
      cancelled = true
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [clearCart, orderId])

  const paymentState = order?.paymentStatus
  const isPaid = paymentState === "PAID"
  const isPending = !order || paymentState === "PENDING"
  const title = isPaid ? "Pagamento Aprovado" : isPending ? "Pagamento em Análise" : "Pagamento não Aprovado"
  const description = isPaid
    ? "Seu pagamento foi confirmado e o pedido já entrou na fila de separação."
    : isPending
      ? "Estamos aguardando a confirmação do Mercado Pago. Esta página será atualizada automaticamente."
      : "O pagamento não foi aprovado. Você pode retornar ao checkout e tentar novamente."
  const StatusIcon = isPaid ? CheckCircle : isPending ? TimerReset : XCircle

  return (
    <div className="container mx-auto flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
        {loading ? <LoaderCircle className="h-12 w-12 animate-spin text-[var(--color-primary)]" /> : <StatusIcon className="h-12 w-12 text-[var(--color-primary)]" />}
      </div>
      <h1 className="mb-6 text-4xl font-heading uppercase tracking-wider md:text-5xl">{title}</h1>
      <p className="mb-8 max-w-2xl text-gray-400">{description}</p>
      {order ? <p className="mb-8 text-sm text-white">Pedido {getOrderDisplayNumber(order)}</p> : null}
      {error ? <p className="mb-8 text-sm text-red-400">{error}</p> : null}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href="/account/orders" className="glass px-8 py-4 font-bold uppercase tracking-widest text-white hover:bg-white/10">Ver Meus Pedidos</Link>
        {!isPaid && !isPending ? <Link href="/checkout" className="bg-[var(--color-primary)] px-8 py-4 font-bold uppercase tracking-widest text-black">Tentar novamente</Link> : null}
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return <Suspense fallback={<div className="container mx-auto min-h-[70vh] px-4 py-20" />}><CheckoutSuccessContent /></Suspense>
}
