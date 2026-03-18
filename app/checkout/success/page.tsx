"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle, LoaderCircle, MessageCircle, TimerReset } from "lucide-react"
import { useCartStore } from "@/store/cartStore"

type CheckoutSessionSummary = {
  id: string
  status: string | null
  paymentStatus: string | null
  order: {
    id: string
    status: string
    total: number
    shippingType: string
  } | null
}

function buildSuccessCopy(summary: CheckoutSessionSummary | null) {
  if (!summary?.order) {
    return {
      title: "Pedido Recebido",
      description:
        "Seu pedido foi criado e está aguardando a confirmação final do pagamento no Stripe.",
      icon: TimerReset,
    }
  }

  if (summary.order.status === "PAID" || summary.paymentStatus === "paid") {
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

type CheckoutSessionSummaryResponse = CheckoutSessionSummary | { error?: string }

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const { clearCart } = useCartStore()
  const [summary, setSummary] = useState<CheckoutSessionSummary | null>(null)
  const [loading, setLoading] = useState(Boolean(sessionId))
  const [error, setError] = useState("")

  useEffect(() => {
    clearCart()
  }, [clearCart])

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadSummary() {
      try {
        const response = await fetch(`/api/checkout/session/${sessionId}`, {
          cache: "no-store",
        })
        const data = (await response.json()) as CheckoutSessionSummaryResponse

        if (!response.ok || "error" in data) {
          throw new Error(("error" in data && data.error) || "Não foi possível consultar o checkout.")
        }

        if (!cancelled) {
          setSummary(data as CheckoutSessionSummary)
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

    loadSummary()

    return () => {
      cancelled = true
    }
  }, [sessionId])

  const copy = useMemo(() => buildSuccessCopy(summary), [summary])
  const StatusIcon = copy.icon
  const whatsappMessage = summary?.order
    ? `Olá! Acabei de finalizar o pedido ${summary.order.id} no site e gostaria de acompanhar.`
    : "Olá! Acabei de finalizar um pedido no site e gostaria de acompanhar."

  return (
    <div className="container mx-auto px-4 py-20 min-h-[70vh] flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center mb-8">
        {loading ? <LoaderCircle className="w-12 h-12 text-[var(--color-primary)] animate-spin" /> : <StatusIcon className="w-12 h-12 text-[var(--color-primary)]" />}
      </div>

      <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-6">
        {copy.title.split(" ").slice(0, -1).join(" ")}{" "}
        <span className="text-[var(--color-primary)]">{copy.title.split(" ").slice(-1)}</span>
      </h1>

      <p className="text-gray-400 mb-4 max-w-xl mx-auto">{copy.description}</p>

      {summary?.order ? (
        <p className="text-sm text-gray-500 mb-8">
          Pedido #{summary.order.id.split("-")[0].toUpperCase()} • Status atual: {summary.order.status}
        </p>
      ) : null}

      {error ? <p className="mb-8 text-sm text-red-400">{error}</p> : null}

      <div className="flex flex-col sm:flex-row gap-4 mb-12">
        <a
          href={`https://wa.me/5585997839040?text=${encodeURIComponent(whatsappMessage)}`}
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
