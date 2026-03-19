const BRL_INPUT_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function maskCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "")

  if (!digits) {
    return ""
  }

  return BRL_INPUT_FORMATTER.format(Number(digits) / 100)
}

export function formatCurrencyInputValue(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return ""
  }

  return BRL_INPUT_FORMATTER.format(value)
}

export function parseCurrencyInputValue(value: string) {
  const digits = value.replace(/\D/g, "")

  if (!digits) {
    return null
  }

  return Number(digits) / 100
}

export function formatChangeAmount(total: number, receivedAmount: number | null) {
  if (receivedAmount == null) {
    return null
  }

  return Math.max(Number((receivedAmount - total).toFixed(2)), 0)
}

export function maskPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)

  if (digits.length <= 2) {
    return digits ? `(${digits}` : ""
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function maskPostalCodeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8)

  if (digits.length <= 5) {
    return digits
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}
