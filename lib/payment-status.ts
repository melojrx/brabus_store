export const PAYMENT_METHOD_VALUES = [
  "STRIPE_CARD",
  "STRIPE_PIX",
  "CASH",
  "MANUAL_PIX",
  "POS_DEBIT",
  "POS_CREDIT",
] as const

export const PAYMENT_STATUS_VALUES = [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const

export type PaymentMethodValue = (typeof PAYMENT_METHOD_VALUES)[number]
export type PaymentStatusValue = (typeof PAYMENT_STATUS_VALUES)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  STRIPE_CARD: "Stripe Cartão",
  STRIPE_PIX: "Stripe Pix",
  CASH: "Dinheiro",
  MANUAL_PIX: "Pix Manual",
  POS_DEBIT: "Cartão Débito",
  POS_CREDIT: "Cartão Crédito",
}

export const PAYMENT_STATUS_META: Record<
  PaymentStatusValue,
  {
    label: string
    softClassName: string
    outlinedClassName: string
  }
> = {
  PENDING: {
    label: "Aguardando Pagamento",
    softClassName: "bg-yellow-500/20 text-yellow-300",
    outlinedClassName: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
  },
  PAID: {
    label: "Pago",
    softClassName: "bg-green-500/20 text-green-300",
    outlinedClassName: "bg-green-500/15 text-green-300 border border-green-500/30",
  },
  FAILED: {
    label: "Falhou",
    softClassName: "bg-zinc-500/20 text-zinc-300",
    outlinedClassName: "bg-zinc-500/15 text-zinc-300 border border-zinc-500/30",
  },
  CANCELLED: {
    label: "Cancelado",
    softClassName: "bg-red-500/20 text-red-300",
    outlinedClassName: "bg-red-500/15 text-red-300 border border-red-500/30",
  },
  REFUNDED: {
    label: "Reembolsado",
    softClassName: "bg-fuchsia-500/20 text-fuchsia-300",
    outlinedClassName: "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30",
  },
}

export function getPaymentMethodLabel(value: PaymentMethodValue) {
  return PAYMENT_METHOD_LABELS[value]
}

export function getPaymentStatusMeta(value: PaymentStatusValue) {
  return PAYMENT_STATUS_META[value]
}
