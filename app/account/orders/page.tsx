import Link from "next/link"
import { ArrowLeft, Package } from "lucide-react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatStatus(status: string) {
  switch (status) {
    case "PAID":
      return "Pago"
    case "PENDING":
      return "Pendente"
    case "SHIPPED":
      return "Enviado"
    case "DELIVERED":
      return "Entregue"
    case "CANCELLED":
      return "Cancelado"
    case "REFUNDED":
      return "Reembolsado"
    default:
      return status
  }
}

export default async function AccountOrdersPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      shippingType: true,
    },
  })

  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Minha Conta
      </Link>

      <div className="mb-10 flex flex-col gap-3 border-b border-white/10 pb-8">
        <h1 className="text-4xl font-heading uppercase tracking-wider text-white">
          Meus <span className="text-[var(--color-primary)]">Pedidos</span>
        </h1>
        <p className="text-gray-400">Histórico completo de compras, status e acesso rápido ao detalhe de cada pedido.</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-sm border border-dashed border-white/10 px-6 py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-600" />
          <p className="mt-4 text-gray-400">Você ainda não possui pedidos.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex rounded-sm border border-[var(--color-primary)]/40 px-5 py-3 text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
          >
            Ir para Produtos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="flex flex-col gap-5 rounded-sm border border-white/5 bg-zinc-900 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs font-mono text-gray-500">Pedido #{order.id.split("-")[0].toUpperCase()}</p>
                <p className="mt-2 text-lg font-heading tracking-wider text-white">
                  {formatCurrency(order.total.toNumber())}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{formatStatus(order.status)}</span>
                  <span>
                    {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span>{order.shippingType === "PICKUP" ? "Retirada" : "Entrega"}</span>
                </div>
              </div>

              <Link
                href={`/account/orders/${order.id}`}
                className="inline-flex rounded-sm border border-white/15 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                Ver Detalhes
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
