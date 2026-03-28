const ORDER_NUMBER_TIMEZONE = "America/Fortaleza"

const ORDER_NUMBER_PREFIX_BY_CHANNEL: Record<string, string> = {
  ONLINE: "ON",
  PDV: "PDV",
  LEGACY: "LG",
}

function getDateParts(date: Date, timeZone = ORDER_NUMBER_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const parts = formatter.formatToParts(date)

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "0000",
    month: parts.find((part) => part.type === "month")?.value ?? "00",
    day: parts.find((part) => part.type === "day")?.value ?? "00",
  }
}

export function buildOrderNumberDateKey(date: Date) {
  const { year, month, day } = getDateParts(date)
  return `${year}${month}${day}`
}

export function getOrderNumberPrefix(channel: string | null | undefined) {
  if (!channel) {
    return ORDER_NUMBER_PREFIX_BY_CHANNEL.LEGACY
  }

  return ORDER_NUMBER_PREFIX_BY_CHANNEL[channel] ?? ORDER_NUMBER_PREFIX_BY_CHANNEL.LEGACY
}

export function buildOrderNumber(input: {
  channel: string | null | undefined
  createdAt: Date
  sequence: number
}) {
  const dateKey = buildOrderNumberDateKey(input.createdAt)
  const yyMMdd = dateKey.slice(2)
  const sequence = String(input.sequence).padStart(4, "0")

  return `${getOrderNumberPrefix(input.channel)}-${yyMMdd}-${sequence}`
}

export function getOrderDisplayNumber(input: {
  id: string
  orderNumber?: string | null
}) {
  if (input.orderNumber?.trim()) {
    return input.orderNumber.trim()
  }

  return input.id.slice(0, 8).toUpperCase()
}

export { ORDER_NUMBER_TIMEZONE }
