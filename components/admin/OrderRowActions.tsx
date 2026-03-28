"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, OctagonX, Eye, X } from "lucide-react"
import { useMemo, useState, useTransition } from "react"
import AdminInlineFeedback, { type AdminInlineFeedbackState } from "@/components/admin/AdminInlineFeedback"
import { canAdminCancelOrder } from "@/lib/admin-orders"
import { getOrderDisplayNumber } from "@/lib/order-number"
import type { OrderStatusValue } from "@/lib/order-status"
import type { PaymentStatusValue } from "@/lib/payment-status"

type IconActionButtonProps = Readonly<{
  label: string
  disabled?: boolean
  tone?: "default" | "danger"
  icon: React.ReactNode
  href?: string
  onClick?: () => void
}>

function IconActionButton({
  label,
  disabled = false,
  tone = "default",
  icon,
  href,
  onClick,
}: IconActionButtonProps) {
  const toneClassName =
    tone === "danger"
      ? "border-red-500/20 text-red-300 hover:border-red-400/40 hover:bg-red-500/10"
      : "border-white/10 text-zinc-300 hover:border-white/25 hover:bg-white/5 hover:text-white"

  const className = `flex h-9 w-9 items-center justify-center rounded-sm border bg-zinc-950/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 ${toneClassName}`

  return (
    <div className="group relative">
      {href ? (
        <Link href={href} aria-label={label} title={label} className={className}>
          {icon}
        </Link>
      ) : (
        <button
          type="button"
          aria-label={label}
          title={label}
          onClick={onClick}
          disabled={disabled}
          className={className}
        >
          {icon}
        </button>
      )}

      <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-sm border border-white/10 bg-zinc-950 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-200 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
    </div>
  )
}

async function parseErrorMessage(response: Response) {
  try {
    const payload = await response.json()

    if (typeof payload?.error === "string") {
      return payload.error
    }
  } catch {}

  return "Não foi possível cancelar o pedido."
}

function getDisabledCancelLabel(status: OrderStatusValue, paymentStatus: PaymentStatusValue) {
  if (status === "SHIPPED" || status === "DELIVERED") {
    return "Pedido já em expedição"
  }

  if (status === "CANCELLED" || paymentStatus === "CANCELLED") {
    return "Pedido já cancelado"
  }

  if (status === "REFUNDED" || paymentStatus === "REFUNDED") {
    return "Pedido já reembolsado"
  }

  if (status === "FAILED") {
    return "Pedido com pagamento falho"
  }

  return "Cancelamento indisponível"
}

export default function OrderRowActions({
  orderId,
  orderNumber,
  customerName,
  status,
  paymentStatus,
}: {
  orderId: string
  orderNumber?: string | null
  customerName: string
  status: OrderStatusValue
  paymentStatus: PaymentStatusValue
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelFeedback, setCancelFeedback] = useState<AdminInlineFeedbackState>(null)
  const canCancel = canAdminCancelOrder(status, paymentStatus)
  const displayOrderNumber = useMemo(
    () => getOrderDisplayNumber({ id: orderId, orderNumber }),
    [orderId, orderNumber],
  )
  const cancelLabel = canCancel
    ? paymentStatus === "PAID"
      ? "Cancelar pedido"
      : "Cancelar pedido pendente"
    : getDisabledCancelLabel(status, paymentStatus)

  function handleCancel() {
    startTransition(async () => {
      setCancelFeedback(null)

      try {
        const response = await fetch(`/api/admin/orders/${orderId}/cancel`, {
          method: "PATCH",
        })

        if (!response.ok) {
          setCancelFeedback({
            type: "error",
            message: await parseErrorMessage(response),
          })
          return
        }

        setIsCancelModalOpen(false)
        router.refresh()
      } catch {
        setCancelFeedback({
          type: "error",
          message: "Erro de conexão ao cancelar o pedido.",
        })
      }
    })
  }

  const confirmationMessage = paymentStatus === "PAID"
    ? `Cancelar o pedido ${displayOrderNumber} de ${customerName} também vai reverter estoque e encerrar o pagamento. Deseja continuar?`
    : `Cancelar o pedido pendente ${displayOrderNumber} de ${customerName}?`

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <IconActionButton
          label="Visualizar pedido"
          href={`/admin/orders/${orderId}`}
          icon={<Eye className="h-4 w-4" />}
        />
        <IconActionButton
          label={cancelLabel}
          disabled={!canCancel || isPending}
          tone="danger"
          onClick={() => {
            if (!canCancel || isPending) {
              return
            }

            setCancelFeedback(null)
            setIsCancelModalOpen(true)
          }}
          icon={
            isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <OctagonX className="h-4 w-4" />
            )
          }
        />
      </div>

      {isCancelModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar modal de cancelamento"
            onClick={() => {
              if (isPending) {
                return
              }

              setIsCancelModalOpen(false)
              setCancelFeedback(null)
            }}
            className="absolute inset-0 border-0 bg-black/70 p-0 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cancel-order-title-${orderId}`}
            className="relative z-10 w-full max-w-lg rounded-sm border border-white/10 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="rounded-sm border border-red-500/20 bg-red-500/10 p-2 text-red-300">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-red-300">
                    Ação crítica
                  </p>
                  <h3
                    id={`cancel-order-title-${orderId}`}
                    className="mt-2 font-heading text-xl uppercase tracking-wider text-white"
                  >
                    Cancelar pedido
                  </h3>
                </div>
              </div>

              <button
                type="button"
                aria-label="Fechar modal"
                onClick={() => {
                  if (isPending) {
                    return
                  }

                  setIsCancelModalOpen(false)
                  setCancelFeedback(null)
                }}
                disabled={isPending}
                className="text-zinc-500 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="rounded-sm border border-white/10 bg-black/30 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Pedido</p>
                <p className="mt-2 font-mono text-sm text-white">{displayOrderNumber}</p>
                <p className="mt-3 text-sm text-zinc-300">{confirmationMessage}</p>
              </div>

              {paymentStatus === "PAID" ? (
                <div className="rounded-sm border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  O cancelamento vai encerrar o pedido e devolver o estoque dos itens já pagos.
                </div>
              ) : null}

              <AdminInlineFeedback feedback={cancelFeedback} />
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (isPending) {
                    return
                  }

                  setIsCancelModalOpen(false)
                  setCancelFeedback(null)
                }}
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-sm border border-white/15 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-red-500/20 bg-red-500/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-red-100 transition-colors hover:border-red-400/40 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <OctagonX className="h-4 w-4" />}
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
