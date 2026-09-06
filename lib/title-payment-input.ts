import { parseCurrencyInputValue } from "@/lib/currency-input"

export type TitlePaymentMethod = "CASH" | "MANUAL_PIX" | "POS_DEBIT" | "POS_CREDIT"

export function buildTitlePaymentPayload(input: {
  amount: string
  paymentMethod: TitlePaymentMethod
  idempotencyKey: string
}) {
  return {
    amount: parseCurrencyInputValue(input.amount),
    paymentMethod: input.paymentMethod,
    idempotencyKey: input.idempotencyKey,
  }
}
