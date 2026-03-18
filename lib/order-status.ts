export const ORDER_STATUS_VALUES = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "FAILED",
] as const

export type OrderStatusValue = (typeof ORDER_STATUS_VALUES)[number]
export type AdminOrderStatusFilter = "ALL" | OrderStatusValue

export const ORDER_STATUS_META: Record<
  OrderStatusValue,
  {
    label: string
    softClassName: string
    outlinedClassName: string
  }
> = {
  PENDING: {
    label: "Pendente",
    softClassName: "bg-yellow-500/20 text-yellow-400",
    outlinedClassName: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
  },
  PAID: {
    label: "Pago",
    softClassName: "bg-green-500/20 text-green-400",
    outlinedClassName: "bg-green-500/15 text-green-300 border border-green-500/30",
  },
  SHIPPED: {
    label: "Enviado",
    softClassName: "bg-blue-500/20 text-blue-400",
    outlinedClassName: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  },
  DELIVERED: {
    label: "Entregue",
    softClassName: "bg-emerald-500/20 text-emerald-400",
    outlinedClassName: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  },
  CANCELLED: {
    label: "Cancelado",
    softClassName: "bg-red-500/20 text-red-400",
    outlinedClassName: "bg-red-500/15 text-red-300 border border-red-500/30",
  },
  REFUNDED: {
    label: "Reembolsado",
    softClassName: "bg-fuchsia-500/20 text-fuchsia-400",
    outlinedClassName: "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30",
  },
  FAILED: {
    label: "Falhou",
    softClassName: "bg-zinc-500/20 text-zinc-400",
    outlinedClassName: "bg-zinc-500/15 text-zinc-300 border border-zinc-500/30",
  },
}

export const ADMIN_ORDER_STATUS_OPTIONS: ReadonlyArray<{
  value: AdminOrderStatusFilter
  label: string
}> = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: ORDER_STATUS_META.PENDING.label },
  { value: "PAID", label: ORDER_STATUS_META.PAID.label },
  { value: "SHIPPED", label: ORDER_STATUS_META.SHIPPED.label },
  { value: "DELIVERED", label: ORDER_STATUS_META.DELIVERED.label },
  { value: "CANCELLED", label: ORDER_STATUS_META.CANCELLED.label },
  { value: "REFUNDED", label: ORDER_STATUS_META.REFUNDED.label },
  { value: "FAILED", label: ORDER_STATUS_META.FAILED.label },
]

export function isOrderStatusValue(value: string | null | undefined): value is OrderStatusValue {
  if (!value) {
    return false
  }

  return ORDER_STATUS_VALUES.includes(value as OrderStatusValue)
}

export function parseAdminOrderStatusFilter(value: string | null | undefined): AdminOrderStatusFilter {
  if (!value || value === "ALL") {
    return "ALL"
  }

  return isOrderStatusValue(value) ? value : "ALL"
}

export function getOrderStatusMeta(status: OrderStatusValue) {
  return ORDER_STATUS_META[status]
}
