export const DEFAULT_EXPIRY_WARNING_DAYS = 30
export const DEFAULT_EXPIRY_CRITICAL_DAYS = 7

export type ExpiryAlertLevel = "warning" | "critical" | "expired"

export type ExpiryLevel = "none" | "ok" | ExpiryAlertLevel

export type ExpiryThresholds = {
  warningDays: number
  criticalDays: number
}

const STORE_TIMEZONE = "America/Fortaleza"

function startOfDayInStoreTimezone(date = new Date()) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)

  return new Date(`${dateKey}T00:00:00-03:00`)
}

export function buildVariantLabel(variant: {
  name: string | null
  size: string | null
  color: string | null
  flavor: string | null
}) {
  const parts = [variant.name, variant.size, variant.color, variant.flavor]
    .map((value) => value?.trim())
    .filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Padrão"
}

export function getDaysUntilExpiry(expiresAt: Date, now = new Date()) {
  const today = startOfDayInStoreTimezone(now).getTime()
  const expiryDay = startOfDayInStoreTimezone(expiresAt).getTime()
  return Math.round((expiryDay - today) / (24 * 60 * 60 * 1000))
}

export function getExpiryLevel(
  expiresAt: Date | string | null | undefined,
  thresholds: ExpiryThresholds,
  now = new Date(),
): ExpiryLevel {
  if (!expiresAt) {
    return "none"
  }

  const parsedExpiresAt = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt
  if (Number.isNaN(parsedExpiresAt.getTime())) {
    return "none"
  }

  const daysLeft = getDaysUntilExpiry(parsedExpiresAt, now)

  if (daysLeft < 0) {
    return "expired"
  }

  if (daysLeft <= thresholds.criticalDays) {
    return "critical"
  }

  if (daysLeft <= thresholds.warningDays) {
    return "warning"
  }

  return "ok"
}

export function getExpiryBadgeLabel(level: ExpiryLevel, daysLeft?: number) {
  switch (level) {
    case "expired":
      return "Vencido"
    case "critical":
      return typeof daysLeft === "number" ? `Vence em ${daysLeft}d` : "Vence em breve"
    case "warning":
      return typeof daysLeft === "number" ? `Vence em ${daysLeft}d` : "Próximo do vencimento"
    case "none":
      return "Sem validade"
    default:
      return null
  }
}

export function getExpiryBadgeClass(level: ExpiryLevel) {
  switch (level) {
    case "expired":
      return "bg-red-500/20 text-red-400"
    case "critical":
      return "bg-orange-500/20 text-orange-400"
    case "warning":
      return "bg-yellow-500/20 text-yellow-500"
    case "none":
      return "bg-zinc-500/20 text-zinc-400"
    default:
      return ""
  }
}

export function formatExpiresAtInput(value: string | null | undefined) {
  if (!value) {
    return ""
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ""
  }

  return parsed.toISOString().slice(0, 10)
}

export function getDateKeyInStoreTimezone(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function addDaysFromToday(days: number, now = new Date()) {
  const base = new Date(`${getDateKeyInStoreTimezone(now)}T12:00:00.000Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base
}
