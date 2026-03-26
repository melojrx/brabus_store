import Link from "next/link"
import type { ReactNode } from "react"
import {
  AlertTriangle,
  DollarSign,
  Package,
  PackageOpen,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react"
import {
  DASHBOARD_PERIOD_OPTIONS,
  DEFAULT_DASHBOARD_PERIOD,
  DASHBOARD_TAB_VALUES,
  type DashboardPeriod,
  type DashboardTab,
  LOW_STOCK_THRESHOLD,
  getAdminDashboardData,
  parseDashboardPeriod,
} from "@/lib/admin-dashboard"
import DashboardPeriodPicker from "@/components/admin/DashboardPeriodPicker"
import prisma from "@/lib/prisma"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`
}

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseTab(value: string | string[] | undefined): DashboardTab {
  const candidate = readSearchParam(value)
  return DASHBOARD_TAB_VALUES.includes(candidate as DashboardTab) ? (candidate as DashboardTab) : "overview"
}

function buildDashboardHref({
  tab,
  period,
}: {
  tab: DashboardTab
  period: DashboardPeriod
}) {
  const params = new URLSearchParams()

  if (tab !== "overview") {
    params.set("tab", tab)
  }

  if (period !== DEFAULT_DASHBOARD_PERIOD) {
    params.set("period", period)
  }

  const query = params.toString()
  return query ? `/admin?${query}` : "/admin"
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
    <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">{title}</h3>
          <p className="mt-3 text-3xl font-heading tracking-wider text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[var(--color-primary)]">
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
  currentPeriod,
  label,
}: {
  tab: DashboardTab
  currentTab: DashboardTab
  currentPeriod: DashboardPeriod
  label: string
}) {
  const isActive = tab === currentTab

  return (
    <Link
      href={buildDashboardHref({ tab, period: currentPeriod })}
      className={`rounded-sm px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] transition-colors ${
        isActive
          ? "bg-[var(--color-primary)] text-black"
          : "border border-white/10 text-gray-300 hover:border-white/30 hover:text-white"
      }`}
    >
      {label}
    </Link>
  )
}

function TimelineChart({
  title,
  subtitle,
  data,
  series,
}: {
  title: string
  subtitle: string
  data: ReadonlyArray<Record<string, string | number>>
  series: ReadonlyArray<{
    key: string
    label: string
    color: string
  }>
}) {
  const hasValues = data.some((point) => series.some((item) => Number(point[item.key] ?? 0) > 0))

  if (!hasValues) {
    return (
      <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
        <h3 className="text-lg font-heading tracking-wider uppercase text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
        <p className="mt-6 text-sm text-gray-500">Ainda não há dados suficientes para montar este gráfico.</p>
      </div>
    )
  }

  const width = 640
  const height = 260
  const padding = 24
  const maxValue = Math.max(
    ...data.flatMap((point) => series.map((item) => Number(point[item.key] ?? 0))),
    1,
  )
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0

  function buildLine(key: string) {
    return data
      .map((point, index) => {
        const x = padding + index * stepX
        const value = Number(point[key] ?? 0)
        const y = height - padding - (value / maxValue) * (height - padding * 2)
        return `${x},${y}`
      })
      .join(" ")
  }

  return (
    <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-heading tracking-wider uppercase text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.2em] text-gray-400">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} /> {item.label}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[620px]">
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" />
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" />

            {series.map((item) => (
              <polyline
                key={item.key}
                fill="none"
                stroke={item.color}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={buildLine(item.key)}
              />
            ))}

            {data.map((point, index) => {
              const x = padding + index * stepX
              return (
                <g key={`${String(point.label)}-${index}`}>
                  <text
                    x={x}
                    y={height - 6}
                    textAnchor="middle"
                    fontSize="11"
                    fill="rgba(255,255,255,0.45)"
                  >
                    {String(point.label)}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}

function BarChart({
  title,
  subtitle,
  items,
  formatValue = formatCurrency,
  tone = "primary",
}: {
  title: string
  subtitle: string
  items: ReadonlyArray<{ label: string; value: number }>
  formatValue?: (value: number) => string
  tone?: "primary" | "success"
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
        <h3 className="text-lg font-heading tracking-wider uppercase text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
        <p className="mt-6 text-sm text-gray-500">Ainda não há dados suficientes para este gráfico.</p>
      </div>
    )
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1)
  const barClass = tone === "success" ? "bg-emerald-400" : "bg-[var(--color-primary)]"

  return (
    <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
      <h3 className="text-lg font-heading tracking-wider uppercase text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{subtitle}</p>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-gray-300">{item.label}</span>
              <span className="shrink-0 font-medium text-white">{formatValue(item.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div className={`h-full rounded-full ${barClass}`} style={{ width: `${(item.value / maxValue) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinancialTopProductsTable({
  items,
}: {
  items: ReadonlyArray<{
    name: string
    revenue: number
    cost: number
    profit: number
    units: number
    margin: number
  }>
}) {
  return (
    <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-heading tracking-wider uppercase text-white">Produtos Mais Rentáveis</h3>
        <p className="mt-2 text-sm text-gray-500">Ranking de lucro bruto e margem dentro do recorte atual.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-xs uppercase tracking-[0.2em] text-gray-400">
            <tr>
              <th className="rounded-tl-sm px-4 py-4">Produto</th>
              <th className="px-4 py-4">Unidades</th>
              <th className="px-4 py-4">Faturamento</th>
              <th className="px-4 py-4">Custo</th>
              <th className="px-4 py-4">Lucro</th>
              <th className="rounded-tr-sm px-4 py-4">Margem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.name} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-4 font-medium text-white">{item.name}</td>
                <td className="px-4 py-4 text-gray-300">{formatNumber(item.units)}</td>
                <td className="px-4 py-4 text-gray-300">{formatCurrency(item.revenue)}</td>
                <td className="px-4 py-4 text-gray-300">{formatCurrency(item.cost)}</td>
                <td className="px-4 py-4 font-semibold text-emerald-300">{formatCurrency(item.profit)}</td>
                <td className="px-4 py-4 text-white">{formatPercent(item.margin)}</td>
              </tr>
            ))}

            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  Nenhum produto com historico financeiro suficiente ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StockTopProductsTable({
  items,
}: {
  items: ReadonlyArray<{
    id: string
    name: string
    categoryName: string
    units: number
    value: number
  }>
}) {
  return (
    <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-heading tracking-wider uppercase text-white">Top Produtos em Estoque</h3>
        <p className="mt-2 text-sm text-gray-500">Produtos com maior valor de estoque no catalogo ativo.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-xs uppercase tracking-[0.2em] text-gray-400">
            <tr>
              <th className="rounded-tl-sm px-4 py-4">Produto</th>
              <th className="px-4 py-4">Categoria</th>
              <th className="px-4 py-4">Unidades</th>
              <th className="rounded-tr-sm px-4 py-4">Valor em Estoque</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-4 font-medium text-white">{item.name}</td>
                <td className="px-4 py-4 text-gray-300">{item.categoryName}</td>
                <td className="px-4 py-4 text-gray-300">{formatNumber(item.units)}</td>
                <td className="px-4 py-4 font-semibold text-white">{formatCurrency(item.value)}</td>
              </tr>
            ))}

            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                  Nenhum produto com estoque relevante ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const currentTab = parseTab(resolvedSearchParams.tab)
  const currentPeriod = parseDashboardPeriod(readSearchParam(resolvedSearchParams.period))
  const dashboard = await getAdminDashboardData(prisma, 1, 8, currentPeriod)

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-heading tracking-wider uppercase md:text-5xl">
            Dashboard <span className="text-[var(--color-primary)]">Admin</span>
          </h1>
          <p className="mt-3 max-w-3xl text-gray-400">
            Leitura gerencial da operacao com recorte global de periodo para vendas, financeiro, comercial e estoque.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <DashboardTabLink tab="overview" currentTab={currentTab} currentPeriod={currentPeriod} label="Visão Geral" />
          <DashboardTabLink tab="financial" currentTab={currentTab} currentPeriod={currentPeriod} label="Financeiro" />
          <DashboardTabLink tab="commercial" currentTab={currentTab} currentPeriod={currentPeriod} label="Comercial" />
          <DashboardTabLink tab="stock" currentTab={currentTab} currentPeriod={currentPeriod} label="Estoque" />
          <DashboardPeriodPicker currentPeriod={currentPeriod} currentTab={currentTab} options={DASHBOARD_PERIOD_OPTIONS} />
        </div>
      </div>

      {currentTab === "overview" ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Vendas Totais"
              value={formatCurrency(dashboard.overview.cards.salesTotal)}
              caption={`Vendas concluidas em ${dashboard.period.label.toLowerCase()}.`}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <MetricCard
              title="Total de Pedidos"
              value={formatNumber(dashboard.overview.cards.totalOrders)}
              caption={`Pedidos criados em ${dashboard.period.label.toLowerCase()}.`}
              icon={<Receipt className="h-5 w-5" />}
            />
            <MetricCard
              title="R$ em Estoque"
              value={formatCurrency(dashboard.overview.cards.inventoryValue)}
              caption="Valor atual do estoque ativo por custo cadastrado. Itens sem custo contam como R$ 0,00."
              icon={<Wallet className="h-5 w-5" />}
            />
            <MetricCard
              title="Produtos Cadastrados"
              value={formatNumber(dashboard.overview.cards.productsCount)}
              caption="Total de produtos cadastrados no catalogo."
              icon={<Package className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
            <TimelineChart
              title="Vendas por Período"
              subtitle={`Evolucao das vendas por ${dashboard.period.bucketLabel} dentro de ${dashboard.period.label.toLowerCase()}.`}
              data={dashboard.overview.salesTimeline}
              series={[
                {
                  key: "value",
                  label: "Vendas",
                  color: "var(--color-primary)",
                },
              ]}
            />
            <BarChart
              title="Vendas por Método de Pagamento"
              subtitle={`Comparativo de vendas por pagamento em ${dashboard.period.label.toLowerCase()}.`}
              items={dashboard.overview.paymentMethodSales}
            />
          </div>
        </div>
      ) : null}

      {currentTab === "financial" ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Faturamento"
              value={formatCurrency(dashboard.financial.cards.revenue)}
              caption={`Itens vendidos em pedidos validados em ${dashboard.period.label.toLowerCase()}.`}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <MetricCard
              title="Custo"
              value={formatCurrency(dashboard.financial.cards.cost)}
              caption="Baseado no custo historico congelado em cada venda."
              icon={<Wallet className="h-5 w-5" />}
            />
            <MetricCard
              title="Lucro Bruto"
              value={formatCurrency(dashboard.financial.cards.profit)}
              caption="Diferenca entre faturamento e custo dos itens vendidos."
              icon={<DollarSign className="h-5 w-5" />}
            />
            <MetricCard
              title="Margem"
              value={formatPercent(dashboard.financial.cards.margin)}
              caption="Margem bruta consolidada sobre o faturamento dos itens."
              icon={<ShoppingBag className="h-5 w-5" />}
            />
          </div>

          <TimelineChart
            title="Faturamento vs Lucro Bruto"
            subtitle={`Comparativo financeiro por ${dashboard.period.bucketLabel} em ${dashboard.period.label.toLowerCase()}.`}
            data={dashboard.financial.evolution}
            series={[
              {
                key: "revenue",
                label: "Faturamento",
                color: "var(--color-primary)",
              },
              {
                key: "profit",
                label: "Lucro Bruto",
                color: "#34d399",
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BarChart
              title="Lucro por Categoria"
              subtitle={`Categorias com melhor resultado financeiro em ${dashboard.period.label.toLowerCase()}.`}
              items={dashboard.financial.categoryProfit}
            />
            <BarChart
              title="Lucro por Subcategoria"
              subtitle={`Subcategorias mais rentaveis em ${dashboard.period.label.toLowerCase()}.`}
              items={dashboard.financial.subcategoryProfit}
              tone="success"
            />
          </div>

          <FinancialTopProductsTable items={dashboard.financial.topProducts} />
        </div>
      ) : null}

      {currentTab === "commercial" ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
            <MetricCard
              title="Total de Vendas"
              value={formatCurrency(dashboard.commercial.cards.salesTotal)}
              caption={`Volume comercial validado em ${dashboard.period.label.toLowerCase()}.`}
              icon={<ShoppingBag className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BarChart
              title="Vendas por Método de Pagamento"
              subtitle={`Receita por metodo de pagamento em ${dashboard.period.label.toLowerCase()}.`}
              items={dashboard.commercial.paymentMethodSales}
            />
            <BarChart
              title="Vendas por Canal"
              subtitle="Separacao gerencial entre online, PDV e historico legado."
              items={dashboard.commercial.channelSales}
            />
            <BarChart
              title="Vendas por Categoria"
              subtitle={`Categorias com maior faturamento em ${dashboard.period.label.toLowerCase()}.`}
              items={dashboard.commercial.categorySales}
            />
            <BarChart
              title="Vendas por Subcategoria"
              subtitle={`Subcategorias com maior faturamento em ${dashboard.period.label.toLowerCase()}.`}
              items={dashboard.commercial.subcategorySales}
              tone="success"
            />
          </div>
        </div>
      ) : null}

      {currentTab === "stock" ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Alertas de Estoque"
              value={formatNumber(dashboard.stock.cards.lowStockAlerts)}
              caption={`Variantes ativas abaixo de ${LOW_STOCK_THRESHOLD} unidades.`}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <MetricCard
              title="Valor Total em Estoque"
              value={formatCurrency(dashboard.stock.cards.inventoryValue)}
              caption="Estoque ativo valorizado por custo cadastrado. Itens sem custo contam como R$ 0,00."
              icon={<Wallet className="h-5 w-5" />}
            />
            <MetricCard
              title="Produtos Cadastrados"
              value={formatNumber(dashboard.stock.cards.productsCount)}
              caption="Total atual de produtos no catalogo."
              icon={<Package className="h-5 w-5" />}
            />
            <MetricCard
              title="Unidades em Estoque"
              value={formatNumber(dashboard.stock.cards.stockUnits)}
              caption="Soma das unidades disponiveis nas variantes ativas."
              icon={<PackageOpen className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BarChart
              title="Alertas por Categoria"
              subtitle="Categorias com maior concentracao de variantes em estado de alerta."
              items={dashboard.stock.lowStockByCategory}
              formatValue={formatNumber}
            />
            <BarChart
              title="Valor em Estoque por Categoria"
              subtitle="Distribuicao do capital imobilizado no estoque ativo."
              items={dashboard.stock.inventoryValueByCategory}
            />
          </div>

          <StockTopProductsTable items={dashboard.stock.topProducts} />
        </div>
      ) : null}
    </div>
  )
}
