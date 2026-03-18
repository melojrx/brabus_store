import Link from "next/link"
import { LogOut, Package, Settings, UserRound } from "lucide-react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import AccountProfileClient from "@/app/account/AccountProfileClient"
import { serializeAccountProfile } from "@/lib/account"

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

export default async function AccountPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=/account")
  }

  const [user, recentOrders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        addressStreet: true,
        addressNumber: true,
        addressComplement: true,
        addressNeighborhood: true,
        addressCity: true,
        addressState: true,
        addressZip: true,
      },
    }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
      },
    }),
  ])

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <div className="mb-12 flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-2">
            Minha <span className="text-[var(--color-primary)]">Conta</span>
          </h1>
          <p className="text-gray-400">Gerencie seus dados, endereço principal, senha e acompanhe seus pedidos.</p>
        </div>

        <div className="flex flex-wrap gap-4">
          {(session.user as { role?: string }).role === "ADMIN" ? (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-sm bg-[var(--color-primary)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-black"
            >
              <Settings className="h-4 w-4" /> Painel Admin
            </Link>
          ) : null}
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-2 rounded-sm border border-white/20 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Sair
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-sm border border-white/5 bg-zinc-950 p-5">
          <div className="border-b border-white/5 pb-5">
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Conta</p>
            <p className="mt-3 text-xl font-heading uppercase tracking-wider text-white">{user.name}</p>
            <p className="mt-1 text-sm text-gray-500">{user.email}</p>
          </div>

          <nav className="mt-5 space-y-2 text-sm">
            <Link
              href="/account"
              className="flex items-center gap-3 rounded-sm border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]"
            >
              <UserRound className="h-4 w-4" /> Meus Dados
            </Link>
            <Link
              href="/account/orders"
              className="flex items-center gap-3 rounded-sm border border-white/10 px-4 py-3 font-bold uppercase tracking-[0.18em] text-gray-300 transition-colors hover:border-white/30 hover:text-white"
            >
              <Package className="h-4 w-4" /> Meus Pedidos
            </Link>
          </nav>
        </aside>

        <div className="space-y-8">
          <AccountProfileClient profile={serializeAccountProfile(user)} />

          <section className="rounded-sm border border-white/5 bg-zinc-900 p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl uppercase tracking-wider text-white">Pedidos Recentes</h2>
                <p className="mt-1 text-sm text-gray-500">Acesso rápido aos últimos pedidos da sua conta.</p>
              </div>
              <Link
                href="/account/orders"
                className="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] transition-colors hover:text-white"
              >
                Ver Histórico Completo
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="rounded-sm border border-dashed border-white/10 px-6 py-10 text-center text-gray-500">
                Você ainda não fez nenhum pedido.
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-4 rounded-sm border border-white/5 bg-black/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-xs font-mono text-gray-500">Pedido #{order.id.split("-")[0].toUpperCase()}</p>
                      <p className="mt-1 text-sm text-white">{formatStatus(order.status)}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="font-heading text-lg tracking-wider text-white">
                        {formatCurrency(order.total.toNumber())}
                      </p>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="rounded-sm border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        Detalhes
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
