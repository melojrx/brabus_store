import prisma from "@/lib/prisma"
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher"
import type { StockExpiringEventData } from "@/lib/webhooks/events"
import { sendTelegramMessage } from "@/lib/notifications/telegram"
import {
  addDaysFromToday,
  buildVariantLabel,
  DEFAULT_EXPIRY_CRITICAL_DAYS,
  DEFAULT_EXPIRY_WARNING_DAYS,
  getDaysUntilExpiry,
  getExpiryLevel,
  type ExpiryAlertLevel,
  type ExpiryThresholds,
} from "@/lib/expiry-utils"
import type { Prisma } from "@prisma/client"

export {
  buildVariantLabel,
  DEFAULT_EXPIRY_CRITICAL_DAYS,
  DEFAULT_EXPIRY_WARNING_DAYS,
  getDaysUntilExpiry,
  getExpiryBadgeClass,
  getExpiryBadgeLabel,
  getExpiryLevel,
  type ExpiryAlertLevel,
  type ExpiryLevel,
  type ExpiryThresholds,
} from "@/lib/expiry-utils"

export const EXPIRY_FILTER_VALUES = ["expired", "critical", "warning", "missing"] as const

export type ExpiryFilterValue = (typeof EXPIRY_FILTER_VALUES)[number]

export function parseExpiryFilter(value: string): ExpiryFilterValue | "" {
  return EXPIRY_FILTER_VALUES.includes(value as ExpiryFilterValue) ? (value as ExpiryFilterValue) : ""
}

export async function buildProductExpiryFilterWhere(
  expiryFilter: ExpiryFilterValue | "",
): Promise<Prisma.ProductWhereInput | null> {
  if (!expiryFilter) {
    return null
  }

  const thresholds = await getExpiryThresholds()
  const today = addDaysFromToday(0)
  const variantBase = {
    active: true,
    stock: { gt: 0 },
  }

  if (expiryFilter === "missing") {
    return {
      category: { trackExpiration: true },
      variants: {
        some: {
          ...variantBase,
          expiresAt: null,
        },
      },
    }
  }

  if (expiryFilter === "expired") {
    return {
      category: { trackExpiration: true },
      variants: {
        some: {
          ...variantBase,
          expiresAt: { lt: today },
        },
      },
    }
  }

  if (expiryFilter === "critical") {
    return {
      category: { trackExpiration: true },
      variants: {
        some: {
          ...variantBase,
          expiresAt: {
            gte: today,
            lte: addDaysFromToday(thresholds.criticalDays),
          },
        },
      },
    }
  }

  return {
    category: { trackExpiration: true },
    variants: {
      some: {
        ...variantBase,
        expiresAt: {
          gt: addDaysFromToday(thresholds.criticalDays),
          lte: addDaysFromToday(thresholds.warningDays),
        },
      },
    },
  }
}

export type ExpiringVariantRecord = {
  variantId: string
  sku: string | null
  variantName: string | null
  size: string | null
  color: string | null
  flavor: string | null
  stock: number
  expiresAt: Date
  daysLeft: number
  level: ExpiryAlertLevel
  productId: string
  productName: string
  productSlug: string
  categoryName: string
  subcategoryName: string | null
  variantLabel: string
}

function getDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function isMissingExpiryColumnError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2022"
  )
}

export async function getExpiryThresholds(): Promise<ExpiryThresholds> {
  try {
    const settings = await prisma.storeSettings.findFirst({
      select: {
        expiryWarningDays: true,
        expiryCriticalDays: true,
      },
    })

    const warningDays =
      settings?.expiryWarningDays && settings.expiryWarningDays > 0
        ? settings.expiryWarningDays
        : DEFAULT_EXPIRY_WARNING_DAYS

    const criticalDays =
      settings?.expiryCriticalDays && settings.expiryCriticalDays > 0
        ? settings.expiryCriticalDays
        : DEFAULT_EXPIRY_CRITICAL_DAYS

    return {
      warningDays: Math.max(warningDays, criticalDays),
      criticalDays,
    }
  } catch (error) {
    if (isMissingExpiryColumnError(error)) {
      return {
        warningDays: DEFAULT_EXPIRY_WARNING_DAYS,
        criticalDays: DEFAULT_EXPIRY_CRITICAL_DAYS,
      }
    }

    throw error
  }
}

type FindExpiringVariantsOptions = {
  levels?: ExpiryAlertLevel[]
  minStock?: number
  onlyTrackedCategories?: boolean
  thresholds?: ExpiryThresholds
}

export async function findExpiringVariants(
  options: FindExpiringVariantsOptions = {},
): Promise<ExpiringVariantRecord[]> {
  try {
    const {
      levels,
      minStock = 1,
      onlyTrackedCategories = true,
      thresholds = await getExpiryThresholds(),
    } = options

    const variants = await prisma.productVariant.findMany({
      where: {
        active: true,
        stock: { gte: minStock },
        product: {
          active: true,
          category: onlyTrackedCategories ? { trackExpiration: true } : undefined,
        },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        size: true,
        color: true,
        flavor: true,
        stock: true,
        expiresAt: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: {
              select: {
                name: true,
                trackExpiration: true,
                parent: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ expiresAt: "asc" }, { stock: "asc" }],
    })

    const now = new Date()
    const records: ExpiringVariantRecord[] = []

    for (const variant of variants) {
      if (onlyTrackedCategories && !variant.product.category.trackExpiration) {
        continue
      }

      if (!variant.expiresAt) {
        continue
      }

      const level = getExpiryLevel(variant.expiresAt, thresholds, now)
      if (level === "none" || level === "ok") {
        continue
      }

      if (levels && !levels.includes(level)) {
        continue
      }

      const daysLeft = getDaysUntilExpiry(variant.expiresAt, now)
      const categoryName = variant.product.category.parent?.name ?? variant.product.category.name
      const subcategoryName = variant.product.category.parent ? variant.product.category.name : null

      records.push({
        variantId: variant.id,
        sku: variant.sku,
        variantName: variant.name,
        size: variant.size,
        color: variant.color,
        flavor: variant.flavor,
        stock: variant.stock,
        expiresAt: variant.expiresAt,
        daysLeft,
        level,
        productId: variant.product.id,
        productName: variant.product.name,
        productSlug: variant.product.slug,
        categoryName,
        subcategoryName,
        variantLabel: buildVariantLabel(variant),
      })
    }

    return records.sort((a, b) => a.daysLeft - b.daysLeft)
  } catch (error) {
    if (isMissingExpiryColumnError(error)) {
      return []
    }

    throw error
  }
}

export async function findVariantsMissingExpiry(options?: { minStock?: number }) {
  const minStock = options?.minStock ?? 1

  const variants = await prisma.productVariant.findMany({
    where: {
      active: true,
      stock: { gte: minStock },
      expiresAt: null,
      product: {
        active: true,
        category: { trackExpiration: true },
      },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      size: true,
      color: true,
      flavor: true,
      stock: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: {
            select: {
              name: true,
              parent: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ stock: "desc" }],
    take: 20,
  })

  return variants.map((variant) => ({
    variantId: variant.id,
    stock: variant.stock,
    productName: variant.product.name,
    variantLabel: buildVariantLabel(variant),
    categoryName: variant.product.category.parent?.name ?? variant.product.category.name,
  }))
}

function buildItemsSummary(items: ExpiringVariantRecord[]) {
  return items
    .slice(0, 10)
    .map((item) => `${item.productName} (${item.variantLabel}) — ${item.daysLeft}d`)
    .join("; ")
}

function buildTelegramDigest(items: ExpiringVariantRecord[], dateKey: string) {
  if (items.length === 0) {
    return `Brabus Store — alertas de vencimento (${dateKey})\nNenhum produto em alerta hoje.`
  }

  const grouped = {
    expired: items.filter((item) => item.level === "expired"),
    critical: items.filter((item) => item.level === "critical"),
    warning: items.filter((item) => item.level === "warning"),
  }

  const lines = [`Brabus Store — alertas de vencimento (${dateKey})`, ""]

  for (const [label, bucket] of [
    ["Vencidos", grouped.expired],
    ["Críticos", grouped.critical],
    ["Atenção", grouped.warning],
  ] as const) {
    if (bucket.length === 0) continue
    lines.push(`${label} (${bucket.length}):`)
    for (const item of bucket.slice(0, 8)) {
      lines.push(`• ${item.productName} — ${item.variantLabel} — estoque ${item.stock} — ${item.daysLeft}d`)
    }
    if (bucket.length > 8) {
      lines.push(`… +${bucket.length - 8} itens`)
    }
    lines.push("")
  }

  return lines.join("\n").trim()
}

export type ExpiryAlertJobResult = {
  dateKey: string
  scanned: number
  notified: number
  skippedDuplicates: number
  telegramSent: boolean
  webhookEvents: number
}

export async function runExpiryAlertJob(): Promise<ExpiryAlertJobResult> {
  const dateKey = getDateKey()
  const settings = await prisma.storeSettings.findFirst({
    select: {
      expiryAlertsEnabled: true,
      expiryWarningDays: true,
      expiryCriticalDays: true,
      telegramBotToken: true,
      telegramChatId: true,
    },
  })

  if (settings?.expiryAlertsEnabled === false) {
    return {
      dateKey,
      scanned: 0,
      notified: 0,
      skippedDuplicates: 0,
      telegramSent: false,
      webhookEvents: 0,
    }
  }

  const thresholds = await getExpiryThresholds()
  const items = await findExpiringVariants({ thresholds })
  const pendingByLevel = new Map<ExpiryAlertLevel, ExpiringVariantRecord[]>()

  let skippedDuplicates = 0

  for (const item of items) {
    const existing = await prisma.expiryAlertLog.findUnique({
      where: {
        variantId_alertLevel_dateKey: {
          variantId: item.variantId,
          alertLevel: item.level,
          dateKey,
        },
      },
      select: { id: true },
    })

    if (existing) {
      skippedDuplicates += 1
      continue
    }

    const bucket = pendingByLevel.get(item.level) ?? []
    bucket.push(item)
    pendingByLevel.set(item.level, bucket)
  }

  const pendingItems = Array.from(pendingByLevel.values()).flat()

  if (pendingItems.length === 0) {
    return {
      dateKey,
      scanned: items.length,
      notified: 0,
      skippedDuplicates,
      telegramSent: false,
      webhookEvents: 0,
    }
  }

  for (const item of pendingItems) {
    await prisma.expiryAlertLog.create({
      data: {
        variantId: item.variantId,
        alertLevel: item.level,
        dateKey,
      },
    })
  }

  let telegramSent = false
  const botToken = settings?.telegramBotToken?.trim()
  const chatId = settings?.telegramChatId?.trim()

  if (botToken && chatId) {
    telegramSent = await sendTelegramMessage(botToken, chatId, buildTelegramDigest(pendingItems, dateKey))
  }

  let webhookEvents = 0

  for (const [level, levelItems] of pendingByLevel.entries()) {
    const payload: StockExpiringEventData = {
      alertLevel: level,
      dateKey,
      items: levelItems.map((item) => ({
        variantId: item.variantId,
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        variantLabel: item.variantLabel,
        stock: item.stock,
        expiresAt: item.expiresAt.toISOString(),
        daysLeft: item.daysLeft,
        categoryName: item.categoryName,
        subcategoryName: item.subcategoryName,
      })),
      itemsSummary: buildItemsSummary(levelItems),
    }

    await dispatchWebhookEvent("stock.expiring", payload)
    webhookEvents += 1
  }

  return {
    dateKey,
    scanned: items.length,
    notified: pendingItems.length,
    skippedDuplicates,
    telegramSent,
    webhookEvents,
  }
}
