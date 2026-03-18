import Link from "next/link"
import type { ReactNode } from "react"
import { OrderStatus } from "@prisma/client"
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  PackageOpen,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react"
import {
  DASHBOARD_ORDERS_PAGE_SIZE,
  DASHBOARD_TAB_VALUES,
  type DashboardTab,
  LOW_STOCK_THRESHOLD,
  getAdminDashboardData,
} from "@/lib/admin-dashboard"
import prisma from "@/lib/prisma"

const STATUS_META: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30" },
  PAID: { label: "Pago", cls: "bg-green-500/15 text-green-300 border border-green-500/30" },
  SHIPPED: { label: "Enviado", cls: "bg-blue-500/15 text-blue-300 border border-blue-500/30" },
  DELIVERED: { label: "Entregue", cls: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" },
  CANCELLED: { label: "Cancelado", cls: "bg-red-500/15 text-red-300 border border-red-500/30" },
  REFUNDED: { label: "Reembolsado", cls: "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30" },
  FAILED: { label: "Falhou", cls: "bg-zinc-500/15 text-zinc-300 border border-zinc-500/30" },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`
}

function parseTab(value: string | string[] | undefined): DashboardTab {
  const candidate = Array.isArray(value) ? value[0] : value

  return DASHBOARD_TAB_VALUES.includes(candidate as DashboardTab) ? (candidate as DashboardTab) : "overview"
}

function parsePage(value: string | string[] | undefined) {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] : value || "1", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function MetricCard({
  title,
  value,
  caption,
  icon,
}: {
  title: string
  value: string
  caption: string
  icon: ReactNode
}) {
  return (
    <div className="bg-zinc-900 border border-white/5 p-6 rounded-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">{title}</h3>
          <p className="text-3xl font-heading tracking-wider text-white mt-3">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[var(--color-primary)]">
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-500">{caption}</p>
    </div>
  )
}

function DashboardTabLink({
  tab,
  currentTab,
  label,
}: {
  tab: DashboardTab
  currentTab: DashboardTab
  label: string
}) {
  const isActive = tab === currentTab

  return (
    <Link
      href={`/admin?tab=${tab}`}
      className={`px-4 py-3 rounded-sm text-sm font-bold uppercase tracking-[0.2em] transition-colors ${
        isActive
          ? "bg-[var(--color-primary)] text-black"
          : "border border-white/10 text-gray-300 hover:border-white/30 hover:text-white"
      }`}
    >
      {label}
    </Link>
  )
}

function LineChart({
  data,
}: {
  data: ReadonlyArray<{
    label: string
    revenue: number
    profit: number
  }>
}) {
  if (data.length === 0 || data.every((point) => point.revenue === 0 && point.profit === 0)) {
    return <p className="text-sm text-gray-500">Ainda não há vendas suficientes para montar a evolução financeira.</p>
  }

  const width = 640
  const height = 260
  const padding = 24
  const maxValue = Math.max(...data.flatMap((point) => [point.revenue, point.profit]), 1)
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0

  const buildLine = (values: number[]) =>
    values
      .map((value, index) => {
        const x = padding + index * stepX
        const y = height - padding - (value / maxValue) * (height - padding * 2)
        return `${x},${y}`
      })
      .join(" ")

  const revenueLine = buildLine(data.map((point) => point.revenue))
  const profitLine = buildLine(data.map((point) => point.profit))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-gray-400">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[var(--color-primary)]" /> Faturamento
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400" /> Lucro Bruto
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[620px]">
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" />
          <polyline
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={revenueLine}
          />
          <polyline
            fill="none"
            stroke="#34d399"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={profitLine}
          />
          {data.map((point, index) => {
            const x = padding + index * stepX
            return (
              <g key={point.label}>
                <text
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="rgba(255,255,255,0.45)"
                >
                  {point.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function BarChart({
  title,
  subtitle,
  items,
  tone = "primary",
}: {
  title: string
  subtitle: string
  items: ReadonlyArray<{ label: string; value: number }>
  tone?: "primary" | "success"
}) {
  if (items.length === 0) {
    return (
      <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
        <h3 className="text-lg font-heading tracking-wider uppercase text-white">{title}</h3>
        <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
        <p className="text-sm text-gray-500 mt-6">Ainda não há dados suficientes para este gráfico.</p>
      </div>
    )
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1)
  const barClass = tone === "success" ? "bg-emerald-400" : "bg-[var(--color-primary)]"

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
      <h3 className="text-lg font-heading tracking-wider uppercase text-white">{title}</h3>
      <p className="text-sm text-gray-500 mt-2">{subtitle}</p>

      <div className="space-y-4 mt-6">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 text-sm mb-2">
              <span className="text-gray-300 truncate">{item.label}</span>
              <span className="text-white font-medium shrink-0">{formatCurrency(item.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full rounded-full ${barClass}`} style={{ width: `${(item.value / maxValue) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PaginationLink({
  page,
  currentPage,
  disabled = false,
  label,
}: {
  page: number
  currentPage: number
  disabled?: boolean
  label: string
}) {
  if (disabled) {
    return (
      <span className="px-3 py-2 rounded-sm border border-white/5 text-gray-600 text-sm uppercase tracking-[0.2em]">
        {label}
      </span>
    )
  }

  const isActive = page === currentPage

  return (
    <Link
      href={`/admin?tab=overview&page=${page}`}
      className={`px-3 py-2 rounded-sm text-sm uppercase tracking-[0.2em] transition-colors ${
        isActive
          ? "bg-[var(--color-primary)] text-black font-bold"
          : "border border-white/10 text-gray-300 hover:border-white/30 hover:text-white"
      }`}
    >
      {label}
    </Link>
  )
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const currentTab = parseTab(resolvedSearchParams.tab)
  const currentPage = parsePage(resolvedSearchParams.page)
  const dashboard = await getAdminDashboardData(prisma, currentPage, DASHBOARD_ORDERS_PAGE_SIZE)

  return (
    <div className="space-y-10">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-heading tracking-wider uppercase">
            Dashboard <span className="text-[var(--color-primary)]">Admin</span>
          </h1>
          <p className="text-gray-400 mt-3 max-w-3xl">
            Painel operacional e financeiro com foco em leitura rápida, usando pedidos pagos, enviados e entregues
            como base para os KPIs de margem.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <DashboardTabLink tab="overview" currentTab={currentTab} label="Visão Geral" />
          <DashboardTabLink tab="financial" currentTab={currentTab} label="Acompanhamento Financeiro" />
        </div>
      </div>

      {currentTab === "overview" ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <MetricCard
              title="Receita Total"
              value={formatCurrency(dashboard.overview.cards.revenueTotal)}
              caption="Pedidos com status pago, enviado ou entregue."
              icon={<DollarSign className="w-5 h-5" />}
            />
            <MetricCard
              title="Total de Pedidos"
              value={String(dashboard.overview.cards.totalOrders)}
              caption="Volume total de pedidos registrados na operação."
              icon={<PackageOpen className="w-5 h-5" />}
            />
            <MetricCard
              title="Pedidos Pendentes"
              value={String(dashboard.overview.cards.pendingOrders)}
              caption="Pedidos aguardando confirmação financeira."
              icon={<Receipt className="w-5 h-5" />}
            />
            <MetricCard
              title="Alertas de Estoque"
              value={String(dashboard.overview.cards.lowStockAlerts)}
              caption={`Variantes ativas com estoque abaixo de ${LOW_STOCK_THRESHOLD} unidades.`}
              icon={<AlertTriangle className="w-5 h-5" />}
            />
          </div>

          <section className="pt-8 border-t border-white/5">
            <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-heading tracking-wider uppercase text-white">Últimos Pedidos</h2>
                  <p className="text-sm text-gray-500 mt-2">
                    Página {dashboard.overview.pagination.page} de {dashboard.overview.pagination.totalPages} com{" "}
                    {dashboard.overview.pagination.totalItems} pedidos no total.
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {dashboard.overview.pagination.pageSize} itens por página
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-black text-gray-400 tracking-[0.2em]">
                    <tr>
                      <th className="px-4 py-4 rounded-tl-sm">Id Pedido</th>
                      <th className="px-4 py-4">Cliente</th>
                      <th className="px-4 py-4">Data</th>
                      <th className="px-4 py-4">Valor</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 rounded-tr-sm text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.overview.latestOrders.map((order) => {
                      const statusMeta = STATUS_META[order.status]

                      return (
                        <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-4 font-mono text-xs text-gray-300">{order.id.split("-")[0].toUpperCase()}</td>
                          <td className="px-4 py-4">
                            <div className="min-w-[180px]">
                              <p className="text-white font-medium">{order.customerName}</p>
                              <p className="text-xs text-gray-500 truncate">{order.customerEmail}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-4 text-white font-semibold">{formatCurrency(order.total)}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-sm text-[10px] uppercase tracking-[0.2em] font-bold ${statusMeta.cls}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-bold border border-white/15 px-3 py-2 rounded-sm text-gray-200 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                            >
                              Visualizar <ArrowRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}

                    {dashboard.overview.latestOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                          Nenhum pedido encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {dashboard.overview.pagination.totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                  <PaginationLink
                    page={dashboard.overview.pagination.page - 1}
                    currentPage={dashboard.overview.pagination.page}
                    disabled={dashboard.overview.pagination.page <= 1}
                    label="Anterior"
                  />

                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: dashboard.overview.pagination.totalPages }, (_, index) => index + 1).map((page) => (
                      <PaginationLink key={page} page={page} currentPage={dashboard.overview.pagination.page} label={String(page)} />
                    ))}
                  </div>

                  <PaginationLink
                    page={dashboard.overview.pagination.page + 1}
                    currentPage={dashboard.overview.pagination.page}
                    disabled={dashboard.overview.pagination.page >= dashboard.overview.pagination.totalPages}
                    label="Próxima"
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <MetricCard
              title="Faturamento"
              value={formatCurrency(dashboard.financial.cards.revenue)}
              caption="Baseado em itens vendidos em pedidos financeiramente válidos."
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <MetricCard
              title="Custo"
              value={formatCurrency(dashboard.financial.cards.cost)}
              caption="Somatório de `unitCost` congelado no momento da venda."
              icon={<Wallet className="w-5 h-5" />}
            />
            <MetricCard
              title="Lucro Bruto"
              value={formatCurrency(dashboard.financial.cards.profit)}
              caption="Diferença entre faturamento e custo dos itens vendidos."
              icon={<DollarSign className="w-5 h-5" />}
            />
            <MetricCard
              title="Margem"
              value={formatPercent(dashboard.financial.cards.margin)}
              caption="Margem bruta consolidada sobre o faturamento de produtos."
              icon={<ShoppingBag className="w-5 h-5" />}
            />
          </div>

          <section className="pt-8 border-t border-white/5 space-y-6">
            <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-heading tracking-wider uppercase text-white">Evolução no Tempo</h2>
                <p className="text-sm text-gray-500 mt-2">Leitura leve dos últimos 6 meses com faturamento e lucro bruto.</p>
              </div>
              <LineChart
                data={dashboard.financial.evolution.map((point) => ({
                  label: point.label,
                  revenue: point.revenue,
                  profit: point.profit,
                }))}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <BarChart
                title="Lucro Bruto por Categoria"
                subtitle="Categorias com melhor resultado financeiro consolidado."
                items={dashboard.financial.categoryProfit}
              />
              <BarChart
                title="Lucro Bruto por Subcategoria"
                subtitle="Subcategorias mais rentáveis dentro da operação atual."
                items={dashboard.financial.subcategoryProfit}
                tone="success"
              />
            </div>

            <div className="bg-zinc-900 border border-white/5 rounded-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-heading tracking-wider uppercase text-white">Produtos Mais Rentáveis</h2>
                <p className="text-sm text-gray-500 mt-2">Ranking simples com foco em lucro bruto e margem histórica dos pedidos.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-black text-gray-400 tracking-[0.2em]">
                    <tr>
                      <th className="px-4 py-4 rounded-tl-sm">Produto</th>
                      <th className="px-4 py-4">Unidades</th>
                      <th className="px-4 py-4">Faturamento</th>
                      <th className="px-4 py-4">Custo</th>
                      <th className="px-4 py-4">Lucro Bruto</th>
                      <th className="px-4 py-4 rounded-tr-sm">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.financial.topProducts.map((product) => (
                      <tr key={product.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4 text-white font-medium">{product.name}</td>
                        <td className="px-4 py-4 text-gray-300">{product.units}</td>
                        <td className="px-4 py-4 text-gray-300">{formatCurrency(product.revenue)}</td>
                        <td className="px-4 py-4 text-gray-300">{formatCurrency(product.cost)}</td>
                        <td className="px-4 py-4 text-emerald-300 font-semibold">{formatCurrency(product.profit)}</td>
                        <td className="px-4 py-4 text-white">{formatPercent(product.margin)}</td>
                      </tr>
                    ))}

                    {dashboard.financial.topProducts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                          Nenhum produto com histórico financeiro suficiente ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
