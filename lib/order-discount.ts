type DiscountedOrderTotalInput = {
  subtotal: number
  shippingCost: number
  discountAmount?: number | null
}

type CashChangeInput = {
  total: number
  cashReceivedAmount?: number | null
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

function normalizeMoneyValue(value: number, fieldLabel: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldLabel} invalido.`)
  }

  return roundMoney(value)
}

export function normalizeDiscountAmount(value: number | null | undefined) {
  if (value == null) {
    return 0
  }

  return normalizeMoneyValue(value, "Desconto")
}

export function calculateDiscountedOrderTotal({
  subtotal,
  shippingCost,
  discountAmount,
}: DiscountedOrderTotalInput) {
  const normalizedSubtotal = normalizeMoneyValue(subtotal, "Subtotal")
  const normalizedShippingCost = normalizeMoneyValue(shippingCost, "Frete")
  const normalizedDiscountAmount = normalizeDiscountAmount(discountAmount)
  const grossTotal = roundMoney(normalizedSubtotal + normalizedShippingCost)

  if (normalizedDiscountAmount > grossTotal) {
    throw new Error("O desconto nao pode ser maior que o total do pedido.")
  }

  return {
    grossTotal,
    discountAmount: normalizedDiscountAmount,
    total: roundMoney(grossTotal - normalizedDiscountAmount),
  }
}

export function calculateCashChange({ total, cashReceivedAmount }: CashChangeInput) {
  const normalizedTotal = normalizeMoneyValue(total, "Total")

  if (cashReceivedAmount == null) {
    return null
  }

  const normalizedCashReceivedAmount = normalizeMoneyValue(cashReceivedAmount, "Valor recebido")

  return roundMoney(Math.max(0, normalizedCashReceivedAmount - normalizedTotal))
}
