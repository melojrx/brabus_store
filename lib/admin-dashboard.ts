import { OrderStatus, PrismaClient } from "@prisma/client"

export const DASHBOARD_TAB_VALUES = ["overview", "financial"] as const
export type DashboardTab = (typeof DASHBOARD_TAB_VALUES)[number]

export const LOW_STOCK_THRESHOLD = 10
export const DASHBOARD_ORDERS_PAGE_SIZE = 8

const paidStatuses = [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED]

type DashboardPrismaClient = PrismaClient

type FinancialBucket = {
  label: string
  revenue: number
  cost: number
  profit: number
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

function createMonthlyBuckets(months: number) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  })

  const buckets: FinancialBucket[] = []
  const now = new Date()
  const startMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

  for (let index = 0; index < months; index += 1) {
    const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + index, 1)

    buckets.push({
      label: formatter.format(monthDate).replace(".", ""),
      revenue: 0,
      cost: 0,
      profit: 0,
    })
  }

  return { buckets, startMonth }
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
      subcategoryName: item.subcategoryNameSnapshot || (item.product.category.parent ? item.product.category.name : null),
    }
  }

  return {
    categoryName: item.product.category.parent?.name || item.product.category.name,
    subcategoryName: item.product.category.parent ? item.product.category.name : null,
  }
}

function aggregateMapToSortedArray(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value: currencyValue(value) }))
    .sort((left, right) => right.value - left.value)
}

export async function getAdminDashboardData(prisma: DashboardPrismaClient, page = 1, pageSize = DASHBOARD_ORDERS_PAGE_SIZE) {
  const currentPage = Math.max(1, page)

  const [
    totalOrders,
    pendingOrders,
    revenueAgg,
    lowStockAlerts,
    latestOrdersCount,
    latestOrders,
    paidItems,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: OrderStatus.PENDING } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { in: paidStatuses } },
    }),
    prisma.productVariant.count({
      where: {
        active: true,
        stock: {
          gt: 0,
          lt: LOW_STOCK_THRESHOLD,
        },
        product: {
          active: true,
        },
      },
    }),
    prisma.order.count(),
    prisma.order.findMany({
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          status: {
            in: paidStatuses,
          },
        },
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
            name: true,
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

  const monthlySeries = createMonthlyBuckets(6)
  const revenueByCategory = new Map<string, number>()
  const profitByCategory = new Map<string, number>()
  const profitBySubcategory = new Map<string, number>()
  const productRanking = new Map<string, { revenue: number; cost: number; profit: number; units: number }>()

  let grossRevenue = 0
  let grossCost = 0

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

    const itemMonth = new Date(item.order.createdAt.getFullYear(), item.order.createdAt.getMonth(), 1)
    if (itemMonth >= monthlySeries.startMonth) {
      const monthIndex =
        (itemMonth.getFullYear() - monthlySeries.startMonth.getFullYear()) * 12 +
        (itemMonth.getMonth() - monthlySeries.startMonth.getMonth())

      if (monthIndex >= 0 && monthIndex < monthlySeries.buckets.length) {
        monthlySeries.buckets[monthIndex].revenue += revenue
        monthlySeries.buckets[monthIndex].cost += cost
        monthlySeries.buckets[monthIndex].profit += profit
      }
    }

    revenueByCategory.set(categoryName, (revenueByCategory.get(categoryName) ?? 0) + revenue)
    profitByCategory.set(categoryName, (profitByCategory.get(categoryName) ?? 0) + profit)

    if (subcategoryName) {
      profitBySubcategory.set(subcategoryName, (profitBySubcategory.get(subcategoryName) ?? 0) + profit)
    }

    const rankingEntry = productRanking.get(productName) ?? { revenue: 0, cost: 0, profit: 0, units: 0 }
    rankingEntry.revenue += revenue
    rankingEntry.cost += cost
    rankingEntry.profit += profit
    rankingEntry.units += item.quantity
    productRanking.set(productName, rankingEntry)
  }

  const grossProfit = grossRevenue - grossCost
  const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0
  const totalPages = Math.max(1, Math.ceil(latestOrdersCount / pageSize))

  return {
    overview: {
      cards: {
        revenueTotal: decimalToNumber(revenueAgg._sum.total),
        totalOrders,
        pendingOrders,
        lowStockAlerts,
      },
      latestOrders: latestOrders.map((order) => ({
        id: order.id,
        customerName: order.user.name,
        customerEmail: order.user.email,
        createdAt: order.createdAt.toISOString(),
        total: decimalToNumber(order.total),
        status: order.status,
      })),
      pagination: {
        page: currentPage,
        pageSize,
        totalItems: latestOrdersCount,
        totalPages,
      },
    },
    financial: {
      cards: {
        revenue: grossRevenue,
        cost: grossCost,
        profit: grossProfit,
        margin: grossMargin,
      },
      evolution: monthlySeries.buckets.map((bucket) => ({
        label: bucket.label,
        revenue: currencyValue(bucket.revenue),
        cost: currencyValue(bucket.cost),
        profit: currencyValue(bucket.profit),
      })),
      categoryRevenue: aggregateMapToSortedArray(revenueByCategory).slice(0, 6),
      categoryProfit: aggregateMapToSortedArray(profitByCategory).slice(0, 6),
      subcategoryProfit: aggregateMapToSortedArray(profitBySubcategory).slice(0, 6),
      topProducts: Array.from(productRanking.entries())
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
  }
}
