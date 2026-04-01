import { OrderChannel, OrderStatus, PrismaClient } from "@prisma/client"
import { PAYMENT_METHOD_LABELS, type PaymentMethodValue } from "@/lib/payment-status"

export const DASHBOARD_TAB_VALUES = ["overview", "financial", "commercial", "stock"] as const
export type DashboardTab = (typeof DASHBOARD_TAB_VALUES)[number]

export const DASHBOARD_PERIOD_VALUES = ["today", "7d", "30d", "6m", "12m", "all"] as const
export type DashboardPeriod = (typeof DASHBOARD_PERIOD_VALUES)[number]

export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = "7d"
export const DASHBOARD_ORDERS_PAGE_SIZE = 8
export const LOW_STOCK_THRESHOLD = 10

const paidStatuses = [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED]
const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
})
const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "2-digit",
})
const hourLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
})
const yearLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  year: "numeric",
})

const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = {
  ONLINE: "Online",
  PDV: "PDV",
  LEGACY: "Legado",
}

type DashboardPrismaClient = PrismaClient
type BucketUnit = "hour" | "day" | "month" | "year"

type TimelineBucket = {
  key: string
  label: string
  sales: number
  revenue: number
  cost: number
  profit: number
}

type DashboardPeriodOption = {
  value: DashboardPeriod
  label: string
  shortLabel: string
  bucketUnit: BucketUnit
  bucketLabel: string
}

const DASHBOARD_PERIOD_OPTIONS_MAP: Record<DashboardPeriod, DashboardPeriodOption> = {
  today: {
    value: "today",
    label: "Hoje",
    shortLabel: "Hoje",
    bucketUnit: "hour",
    bucketLabel: "hora",
  },
  "7d": {
    value: "7d",
    label: "Ultimos 7 dias",
    shortLabel: "7 dias",
    bucketUnit: "day",
    bucketLabel: "dia",
  },
  "30d": {
    value: "30d",
    label: "Ultimos 30 dias",
    shortLabel: "30 dias",
    bucketUnit: "day",
    bucketLabel: "dia",
  },
  "6m": {
    value: "6m",
    label: "Ultimos 6 meses",
    shortLabel: "6 meses",
    bucketUnit: "month",
    bucketLabel: "mes",
  },
  "12m": {
    value: "12m",
    label: "Ultimos 12 meses",
    shortLabel: "12 meses",
    bucketUnit: "month",
    bucketLabel: "mes",
  },
  all: {
    value: "all",
    label: "Todo historico",
    shortLabel: "Historico",
    bucketUnit: "year",
    bucketLabel: "ano",
  },
}

export const DASHBOARD_PERIOD_OPTIONS = DASHBOARD_PERIOD_VALUES.map(
  (value) => DASHBOARD_PERIOD_OPTIONS_MAP[value],
)

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1)
}

function addYears(date: Date, amount: number) {
  return new Date(date.getFullYear() + amount, 0, 1)
}

function startOfHour(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours())
}

function addHours(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() + amount)
}

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getHourKey(date: Date) {
  return `${getDayKey(date)}-${String(date.getHours()).padStart(2, "0")}`
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function getYearKey(date: Date) {
  return String(date.getFullYear())
}

function decimalToNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) {
    return 0
  }

  return typeof value === "number" ? value : value.toNumber()
}

function currencyValue(value: number) {
  return Number.isFinite(value) ? value : 0
}

function getDashboardPeriodOption(period: DashboardPeriod) {
  return DASHBOARD_PERIOD_OPTIONS_MAP[period]
}

function getPeriodStartDate(period: DashboardPeriod, now: Date) {
  if (period === "today") {
    return startOfDay(now)
  }

  if (period === "7d") {
    return startOfDay(addDays(now, -6))
  }

  if (period === "30d") {
    return startOfDay(addDays(now, -29))
  }

  if (period === "6m") {
    return startOfMonth(addMonths(now, -5))
  }

  if (period === "12m") {
    return startOfMonth(addMonths(now, -11))
  }

  return null
}

function parseFirstPaidAt(value: { createdAt: Date } | null) {
  return value?.createdAt ?? null
}

function createTimelineBuckets(period: DashboardPeriod, earliestDate: Date | null, now: Date) {
  const periodOption = getDashboardPeriodOption(period)
  const buckets: TimelineBucket[] = []
  const bucketIndexByKey = new Map<string, number>()

  if (periodOption.bucketUnit === "hour") {
    const startDate = startOfDay(now)

    for (let index = 0; index < 24; index += 1) {
      const bucketDate = addHours(startDate, index)
      const key = getHourKey(bucketDate)
      bucketIndexByKey.set(key, index)
      buckets.push({
        key,
        label: hourLabelFormatter.format(bucketDate),
        sales: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      })
    }

    return {
      buckets,
      bucketIndexByKey,
      bucketUnit: periodOption.bucketUnit,
      bucketLabel: periodOption.bucketLabel,
    }
  }

  if (periodOption.bucketUnit === "day") {
    const totalDays = period === "7d" ? 7 : 30
    const startDate = getPeriodStartDate(period, now) ?? startOfDay(now)

    for (let index = 0; index < totalDays; index += 1) {
      const bucketDate = addDays(startDate, index)
      const key = getDayKey(bucketDate)
      bucketIndexByKey.set(key, index)
      buckets.push({
        key,
        label: dayLabelFormatter.format(bucketDate),
        sales: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      })
    }

    return {
      buckets,
      bucketIndexByKey,
      bucketUnit: periodOption.bucketUnit,
      bucketLabel: periodOption.bucketLabel,
    }
  }

  if (periodOption.bucketUnit === "year") {
    const fallbackStart = startOfYear(addYears(now, -4))
    const startDate = earliestDate ? startOfYear(earliestDate) : fallbackStart
    const endDate = startOfYear(now)
    const totalYears = endDate.getFullYear() - startDate.getFullYear() + 1

    for (let index = 0; index < totalYears; index += 1) {
      const bucketDate = addYears(startDate, index)
      const key = getYearKey(bucketDate)
      bucketIndexByKey.set(key, index)
      buckets.push({
        key,
        label: yearLabelFormatter.format(bucketDate),
        sales: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      })
    }

    return {
      buckets,
      bucketIndexByKey,
      bucketUnit: periodOption.bucketUnit,
      bucketLabel: periodOption.bucketLabel,
    }
  }

  const fallbackStart = startOfMonth(addMonths(now, -5))
  const startDate =
    period === "6m"
      ? startOfMonth(addMonths(now, -5))
      : period === "12m"
        ? startOfMonth(addMonths(now, -11))
        : earliestDate
          ? startOfMonth(earliestDate)
          : fallbackStart
  const endDate = startOfMonth(now)
  const totalMonths =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    1

  for (let index = 0; index < totalMonths; index += 1) {
    const bucketDate = addMonths(startDate, index)
    const key = getMonthKey(bucketDate)
    bucketIndexByKey.set(key, index)
    buckets.push({
      key,
      label: monthLabelFormatter.format(bucketDate).replace(".", ""),
      sales: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    })
  }

  return {
    buckets,
    bucketIndexByKey,
    bucketUnit: periodOption.bucketUnit,
    bucketLabel: periodOption.bucketLabel,
  }
}

function buildFallbackCategoryNames(item: {
  categoryNameSnapshot: string | null
  subcategoryNameSnapshot: string | null
  product: {
    category: {
      name: string
      parent: {
        name: string
      } | null
    }
  }
}) {
  if (item.categoryNameSnapshot || item.subcategoryNameSnapshot) {
    return {
      categoryName: item.categoryNameSnapshot || item.product.category.parent?.name || item.product.category.name,
      subcategoryName:
        item.subcategoryNameSnapshot || (item.product.category.parent ? item.product.category.name : null),
    }
  }

  return {
    categoryName: item.product.category.parent?.name || item.product.category.name,
    subcategoryName: item.product.category.parent ? item.product.category.name : null,
  }
}

function aggregateCurrencyMap(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value: currencyValue(value) }))
    .sort((left, right) => right.value - left.value)
}

function aggregateCountMap(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
}

function getPaymentMethodLabel(value: string) {
  return PAYMENT_METHOD_LABELS[value as PaymentMethodValue] ?? value
}

function getOrderChannelLabel(value: OrderChannel) {
  return ORDER_CHANNEL_LABELS[value]
}

function getBucketKey(date: Date, bucketUnit: BucketUnit) {
  if (bucketUnit === "hour") {
    return getHourKey(startOfHour(date))
  }

  if (bucketUnit === "day") {
    return getDayKey(startOfDay(date))
  }

  if (bucketUnit === "year") {
    return getYearKey(startOfYear(date))
  }

  return getMonthKey(startOfMonth(date))
}

export function parseDashboardPeriod(value: string | null | undefined) {
  return DASHBOARD_PERIOD_VALUES.includes(value as DashboardPeriod)
    ? (value as DashboardPeriod)
    : DEFAULT_DASHBOARD_PERIOD
}

export async function getAdminDashboardData(
  prisma: DashboardPrismaClient,
  _page = 1,
  _pageSize = DASHBOARD_ORDERS_PAGE_SIZE,
  period: DashboardPeriod = DEFAULT_DASHBOARD_PERIOD,
) {
  const normalizedPeriod = parseDashboardPeriod(period)
  const periodOption = getDashboardPeriodOption(normalizedPeriod)
  const now = new Date()
  const periodStartDate = getPeriodStartDate(normalizedPeriod, now)
  const orderDateFilter = periodStartDate ? { createdAt: { gte: periodStartDate } } : {}
  const paidOrderFilter = {
    status: {
      in: paidStatuses,
    },
    ...(periodStartDate ? { createdAt: { gte: periodStartDate } } : {}),
  }

  const [
    totalOrders,
    pendingOrders,
    paidOrders,
    paidItems,
    firstPaidOrder,
    productsCount,
    stockVariants,
  ] = await Promise.all([
    prisma.order.count({
      where: orderDateFilter,
    }),
    prisma.order.count({
      where: {
        status: OrderStatus.PENDING,
        ...(periodStartDate ? { createdAt: { gte: periodStartDate } } : {}),
      },
    }),
    prisma.order.findMany({
      where: paidOrderFilter,
      select: {
        total: true,
        createdAt: true,
        paymentMethod: true,
        channel: true,
      },
    }),
    prisma.orderItem.findMany({
      where: {
        order: paidOrderFilter,
      },
      select: {
        quantity: true,
        price: true,
        unitPrice: true,
        unitCost: true,
        productNameSnapshot: true,
        categoryNameSnapshot: true,
        subcategoryNameSnapshot: true,
        order: {
          select: {
            createdAt: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            costPrice: true,
            category: {
              select: {
                name: true,
                parent: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    normalizedPeriod === "all"
      ? prisma.order.findFirst({
          where: {
            status: {
              in: paidStatuses,
            },
          },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        })
      : Promise.resolve(null),
    prisma.product.count(),
    prisma.productVariant.findMany({
      where: {
        product: {
          active: true,
        },
      },
      select: {
        stock: true,
        active: true,
        product: {
          select: {
            id: true,
            name: true,
            costPrice: true,
            category: {
              select: {
                name: true,
                parent: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ])

  const timeline = createTimelineBuckets(normalizedPeriod, parseFirstPaidAt(firstPaidOrder), now)
  const paymentMethodSales = new Map<string, number>()
  const channelSales = new Map<string, number>()
  const categorySales = new Map<string, number>()
  const subcategorySales = new Map<string, number>()
  const categoryProfit = new Map<string, number>()
  const subcategoryProfit = new Map<string, number>()
  const financialProducts = new Map<string, { revenue: number; cost: number; profit: number; units: number }>()
  const lowStockByCategory = new Map<string, number>()
  const inventoryValueByCategory = new Map<string, number>()
  const stockProducts = new Map<string, { units: number; value: number; categoryName: string }>()

  let totalSales = 0
  let grossRevenue = 0
  let grossCost = 0
  let inventoryValue = 0
  let stockUnits = 0
  let lowStockAlerts = 0

  for (const order of paidOrders) {
    const orderTotal = decimalToNumber(order.total)
    totalSales += orderTotal

    const paymentMethodLabel = getPaymentMethodLabel(order.paymentMethod)
    paymentMethodSales.set(paymentMethodLabel, (paymentMethodSales.get(paymentMethodLabel) ?? 0) + orderTotal)

    const channelLabel = getOrderChannelLabel(order.channel)
    channelSales.set(channelLabel, (channelSales.get(channelLabel) ?? 0) + orderTotal)

    const bucketKey = getBucketKey(order.createdAt, timeline.bucketUnit)
    const bucketIndex = timeline.bucketIndexByKey.get(bucketKey)

    if (bucketIndex != null) {
      timeline.buckets[bucketIndex].sales += orderTotal
    }
  }

  for (const item of paidItems) {
    const unitPrice = decimalToNumber(item.unitPrice ?? item.price)
    const unitCost = decimalToNumber(item.unitCost)
    const revenue = unitPrice * item.quantity
    const cost = unitCost * item.quantity
    const profit = revenue - cost
    const productName = item.productNameSnapshot || item.product.name
    const { categoryName, subcategoryName } = buildFallbackCategoryNames(item)

    grossRevenue += revenue
    grossCost += cost

    const bucketKey = getBucketKey(item.order.createdAt, timeline.bucketUnit)
    const bucketIndex = timeline.bucketIndexByKey.get(bucketKey)

    if (bucketIndex != null) {
      timeline.buckets[bucketIndex].revenue += revenue
      timeline.buckets[bucketIndex].cost += cost
      timeline.buckets[bucketIndex].profit += profit
    }

    categorySales.set(categoryName, (categorySales.get(categoryName) ?? 0) + revenue)
    categoryProfit.set(categoryName, (categoryProfit.get(categoryName) ?? 0) + profit)

    if (subcategoryName) {
      subcategorySales.set(subcategoryName, (subcategorySales.get(subcategoryName) ?? 0) + revenue)
      subcategoryProfit.set(subcategoryName, (subcategoryProfit.get(subcategoryName) ?? 0) + profit)
    }

    const financialProduct = financialProducts.get(productName) ?? { revenue: 0, cost: 0, profit: 0, units: 0 }
    financialProduct.revenue += revenue
    financialProduct.cost += cost
    financialProduct.profit += profit
    financialProduct.units += item.quantity
    financialProducts.set(productName, financialProduct)
  }

  for (const variant of stockVariants) {
    if (!variant.active) {
      continue
    }

    const units = Math.max(0, variant.stock)
    const unitCost = decimalToNumber(variant.product.costPrice)
    const stockValue = units * unitCost
    const categoryName =
      variant.product.category.parent?.name ?? variant.product.category.name

    stockUnits += units
    inventoryValue += stockValue
    inventoryValueByCategory.set(categoryName, (inventoryValueByCategory.get(categoryName) ?? 0) + stockValue)

    const stockProduct = stockProducts.get(variant.product.id) ?? {
      units: 0,
      value: 0,
      categoryName,
    }
    stockProduct.units += units
    stockProduct.value += stockValue
    stockProducts.set(variant.product.id, stockProduct)

    if (units > 0 && units < LOW_STOCK_THRESHOLD) {
      lowStockAlerts += 1
      lowStockByCategory.set(categoryName, (lowStockByCategory.get(categoryName) ?? 0) + 1)
    }
  }

  const grossProfit = grossRevenue - grossCost
  const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0

  return {
    period: {
      value: normalizedPeriod,
      label: periodOption.label,
      shortLabel: periodOption.shortLabel,
      bucketLabel: periodOption.bucketLabel,
      startDate: periodStartDate?.toISOString() ?? null,
    },
    overview: {
      cards: {
        salesTotal: currencyValue(totalSales),
        totalOrders,
        inventoryValue: currencyValue(inventoryValue),
        productsCount,
      },
      salesTimeline: timeline.buckets.map((bucket) => ({
        label: bucket.label,
        value: currencyValue(bucket.sales),
      })),
      paymentMethodSales: aggregateCurrencyMap(paymentMethodSales),
    },
    financial: {
      cards: {
        revenue: currencyValue(grossRevenue),
        cost: currencyValue(grossCost),
        profit: currencyValue(grossProfit),
        margin: grossMargin,
      },
      evolution: timeline.buckets.map((bucket) => ({
        label: bucket.label,
        revenue: currencyValue(bucket.revenue),
        profit: currencyValue(bucket.profit),
      })),
      categoryProfit: aggregateCurrencyMap(categoryProfit).slice(0, 6),
      subcategoryProfit: aggregateCurrencyMap(subcategoryProfit).slice(0, 6),
      topProducts: Array.from(financialProducts.entries())
        .map(([name, values]) => ({
          name,
          revenue: currencyValue(values.revenue),
          cost: currencyValue(values.cost),
          profit: currencyValue(values.profit),
          units: values.units,
          margin: values.revenue > 0 ? (values.profit / values.revenue) * 100 : 0,
        }))
        .sort((left, right) => right.profit - left.profit)
        .slice(0, 8),
    },
    commercial: {
      cards: {
        salesTotal: currencyValue(totalSales),
      },
      paymentMethodSales: aggregateCurrencyMap(paymentMethodSales),
      categorySales: aggregateCurrencyMap(categorySales).slice(0, 8),
      subcategorySales: aggregateCurrencyMap(subcategorySales).slice(0, 8),
      channelSales: aggregateCurrencyMap(channelSales),
    },
    stock: {
      cards: {
        lowStockAlerts,
        inventoryValue: currencyValue(inventoryValue),
        productsCount,
        stockUnits,
      },
      lowStockByCategory: aggregateCountMap(lowStockByCategory).slice(0, 8),
      inventoryValueByCategory: aggregateCurrencyMap(inventoryValueByCategory).slice(0, 8),
      topProducts: Array.from(stockProducts.entries())
        .map(([productId, values]) => ({
          id: productId,
          name: stockVariants.find((variant) => variant.product.id === productId)?.product.name ?? "Produto",
          categoryName: values.categoryName,
          units: values.units,
          value: currencyValue(values.value),
        }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 8),
    },
  }
}
