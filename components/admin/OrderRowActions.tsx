"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, OctagonX, Eye } from "lucide-react"
import { useTransition } from "react"
import { canAdminCancelOrder } from "@/lib/admin-orders"
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
  customerName,
  status,
  paymentStatus,
}: {
  orderId: string
  customerName: string
  status: OrderStatusValue
  paymentStatus: PaymentStatusValue
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const canCancel = canAdminCancelOrder(status, paymentStatus)
  const cancelLabel = canCancel
    ? paymentStatus === "PAID"
      ? "Cancelar pedido"
      : "Cancelar pedido pendente"
    : getDisabledCancelLabel(status, paymentStatus)

  function handleCancel() {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/orders/${orderId}/cancel`, {
          method: "PATCH",
        })

        if (!response.ok) {
          window.alert(await parseErrorMessage(response))
          return
        }

        router.refresh()
      } catch {
        window.alert("Erro de conexão ao cancelar o pedido.")
      }
    })
  }

  return (
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

          const confirmationMessage = paymentStatus === "PAID"
            ? `Cancelar o pedido de ${customerName} também vai reverter estoque e encerrar o pagamento. Deseja continuar?`
            : `Cancelar o pedido pendente de ${customerName}?`

          if (!window.confirm(confirmationMessage)) {
            return
          }

          handleCancel()
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
  )
}
