import Link from "next/link"
import { redirect } from "next/navigation"
import { PackageSearch } from "lucide-react"
import { auth } from "@/auth"
import OrderRowActions from "@/components/admin/OrderRowActions"
import {
  ADMIN_ORDERS_PAGE_SIZE,
  getAdminOrders,
  normalizeOrdersPage,
} from "@/lib/admin-orders"
import {
  ADMIN_ORDER_STATUS_OPTIONS,
  getOrderStatusMeta,
  parseAdminOrderStatusFilter,
} from "@/lib/order-status"
import { getPaymentMethodLabel, getPaymentStatusMeta } from "@/lib/payment-status"
import prisma from "@/lib/prisma"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function buildOrdersHref(page: number, status: string) {
  const searchParams = new URLSearchParams()

  if (page > 1) {
    searchParams.set("page", String(page))
  }

  if (status !== "ALL") {
    searchParams.set("status", status)
  }

  const queryString = searchParams.toString()
  return queryString ? `/admin/orders?${queryString}` : "/admin/orders"
}

function FilterLink({
  value,
  label,
  currentStatus,
}: {
  value: string
  label: string
  currentStatus: string
}) {
  const isActive = value === currentStatus

  return (
    <Link
      href={buildOrdersHref(1, value)}
      className={`rounded-sm border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
        isActive
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-black"
          : "border-white/10 text-gray-300 hover:border-white/30 hover:text-white"
      }`}
    >
      {label}
    </Link>
  )
}

function PaginationLink({
  page,
  currentPage,
  status,
  disabled = false,
  label,
}: {
  page: number
  currentPage: number
  status: string
  disabled?: boolean
  label: string
}) {
  if (disabled) {
    return (
      <span className="rounded-sm border border-white/5 px-3 py-2 text-sm uppercase tracking-[0.2em] text-gray-600">
        {label}
      </span>
    )
  }

  const isActive = page === currentPage

  return (
    <Link
      href={buildOrdersHref(page, status)}
      className={`rounded-sm px-3 py-2 text-sm uppercase tracking-[0.2em] transition-colors ${
        isActive
          ? "bg-[var(--color-primary)] text-black"
          : "border border-white/10 text-gray-300 hover:border-white/30 hover:text-white"
      }`}
    >
      {label}
    </Link>
  )
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()

  if (!session || session.user?.role !== "ADMIN") {
    redirect("/")
  }

  const resolvedSearchParams = await searchParams
  const page = normalizeOrdersPage(resolvedSearchParams.page ?? null)
  const status = parseAdminOrderStatusFilter(resolvedSearchParams.status ?? null)
  const orders = await getAdminOrders(prisma, {
    page,
    pageSize: ADMIN_ORDERS_PAGE_SIZE,
    status,
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-white/5 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-500">Operação</p>
          <h1 className="mt-3 text-3xl font-heading uppercase tracking-wider text-white md:text-5xl">
            Gestão de <span className="text-[var(--color-primary)]">Pedidos</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-400">
            Acompanhe a fila operacional, filtre por status e abra o detalhe para atualizar andamento e rastreio.
          </p>
        </div>

        <div className="rounded-sm border border-white/10 bg-zinc-950 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Volume Atual</p>
          <p className="mt-2 text-2xl font-heading tracking-wider text-white">{orders.pagination.totalItems}</p>
          <p className="text-xs text-gray-500">pedidos para o filtro selecionado</p>
        </div>
      </div>

      <section className="space-y-5">
        <div className="flex flex-wrap gap-3">
          {ADMIN_ORDER_STATUS_OPTIONS.map((option) => (
            <FilterLink
              key={option.value}
              value={option.value}
              label={option.label}
              currentStatus={orders.filters.status}
            />
          ))}
        </div>

        <div className="rounded-sm border border-white/5 bg-zinc-900 p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-heading uppercase tracking-wider text-white">Pedidos</h2>
              <p className="mt-2 text-sm text-gray-500">
                Página {orders.pagination.page} de {orders.pagination.totalPages} com {orders.pagination.totalItems} pedidos no total.
              </p>
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
              {orders.pagination.pageSize} itens por página
            </p>
          </div>

          {orders.items.length === 0 ? (
            <div className="rounded-sm border border-dashed border-white/10 px-6 py-16 text-center">
              <PackageSearch className="mx-auto h-10 w-10 text-gray-600" />
              <p className="mt-4 text-sm text-gray-400">Nenhum pedido encontrado para o filtro atual.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-black text-xs uppercase tracking-[0.2em] text-gray-400">
                  <tr>
                    <th className="rounded-tl-sm px-4 py-4">Pedido</th>
                    <th className="px-4 py-4">Cliente</th>
                    <th className="px-4 py-4">Data</th>
                    <th className="px-4 py-4">Entrega</th>
                    <th className="px-4 py-4">Valor</th>
                    <th className="px-4 py-4">Pagamento</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="rounded-tr-sm px-4 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.items.map((order) => {
                    const statusMeta = getOrderStatusMeta(order.status)
                    const paymentStatusMeta = getPaymentStatusMeta(order.paymentStatus)

                    return (
                      <tr key={order.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                        <td className="px-4 py-4 font-mono text-xs text-gray-300">
                          {order.id.split("-")[0].toUpperCase()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="min-w-[220px]">
                            <p className="font-medium text-white">{order.customerName}</p>
                            <p className="truncate text-xs text-gray-500">{order.customerEmail}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-400">
                          <div className="space-y-1">
                            <p>{order.shippingType === "PICKUP" ? "Retirada" : order.shippingCarrier ?? "Entrega"}</p>
                            <p className="text-gray-500">
                              {order.trackingCode ? `Rastreio: ${order.trackingCode}` : "Sem rastreio"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-white">{formatCurrency(order.total)}</td>
                        <td className="px-4 py-4 text-xs">
                          <div className="min-w-[180px] space-y-2">
                            <p className="text-gray-300">{getPaymentMethodLabel(order.paymentMethod)}</p>
                            <span
                              className={`inline-flex rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${paymentStatusMeta.outlinedClassName}`}
                            >
                              {paymentStatusMeta.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${statusMeta.outlinedClassName}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <OrderRowActions
                            orderId={order.id}
                            customerName={order.customerName}
                            status={order.status}
                            paymentStatus={order.paymentStatus}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {orders.pagination.totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <PaginationLink
                page={orders.pagination.page - 1}
                currentPage={orders.pagination.page}
                status={orders.filters.status}
                disabled={orders.pagination.page <= 1}
                label="Anterior"
              />

              <div className="flex flex-wrap gap-2">
                {Array.from({ length: orders.pagination.totalPages }, (_, index) => index + 1).map((paginationPage) => (
                  <PaginationLink
                    key={paginationPage}
                    page={paginationPage}
                    currentPage={orders.pagination.page}
                    status={orders.filters.status}
                    label={String(paginationPage)}
                  />
                ))}
              </div>

              <PaginationLink
                page={orders.pagination.page + 1}
                currentPage={orders.pagination.page}
                status={orders.filters.status}
                disabled={orders.pagination.page >= orders.pagination.totalPages}
                label="Próxima"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
