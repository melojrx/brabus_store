"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  ShoppingBasket,
  Tags,
  Truck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"

type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Produtos", icon: Package },
  { href: "/admin/orders", label: "Pedidos", icon: Receipt },
  { href: "/admin/pdv", label: "PDV", icon: ShoppingBasket },
  { href: "/admin/categories", label: "Categorias", icon: Tags },
  { href: "/admin/customers", label: "Clientes", icon: Users },
  { href: "/admin/shipping", label: "Entrega", icon: Truck },
  { href: "/admin/settings", label: "Configurações", icon: Settings },
]

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function AdminNavLink({
  href,
  label,
  icon: Icon,
  pathname,
  onClick,
}: AdminNavItem & {
  pathname: string
  onClick?: () => void
}) {
  const isActive = isItemActive(pathname, href)

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-sm px-3 py-3 text-sm font-medium transition-colors ${
        isActive
          ? "bg-[var(--color-primary)]/15 text-white"
          : "text-gray-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className={`h-5 w-5 ${isActive ? "text-[var(--color-primary)]" : "text-gray-400"}`} />
      <span>{label}</span>
    </Link>
  )
}

export default function AdminNavigation() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <div className="border-b border-white/5 bg-zinc-950 md:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="min-w-0">
            <span className="block truncate text-lg font-heading uppercase tracking-[0.18em] text-white">
              Brabu&apos;s <span className="text-[var(--color-primary)]">Admin</span>
            </span>
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? "Fechar menu admin" : "Abrir menu admin"}
            onClick={() => setMenuOpen((current) => !current)}
            className="rounded-sm border border-white/10 p-2 text-gray-300 transition-colors hover:border-white/30 hover:text-white"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div className="scrollbar-none overflow-x-auto border-t border-white/5 px-4 py-3">
          <div className="flex min-w-max gap-2">
            {ADMIN_NAV_ITEMS.map(({ href, label, icon }) => {
              const isActive = isItemActive(pathname, href)
              const Icon = icon

              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors ${
                    isActive
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-black"
                      : "border-white/10 text-gray-300 hover:border-white/30 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-white/5 px-4 py-4">
            <nav className="space-y-1">
              {ADMIN_NAV_ITEMS.map((item) => (
                <AdminNavLink
                  key={item.href}
                  {...item}
                  pathname={pathname}
                  onClick={() => setMenuOpen(false)}
                />
              ))}
            </nav>

            <div className="mt-4 border-t border-white/5 pt-4">
              <Link
                href="/api/auth/signout"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-sm px-3 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
              >
                <LogOut className="h-5 w-5" />
                <span>Sair</span>
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="hidden w-64 flex-col border-r border-white/5 bg-zinc-950 md:flex">
        <div className="border-b border-white/5 p-6">
          <Link href="/" className="block">
            <span className="text-xl font-heading tracking-wider uppercase text-white transition-colors hover:text-[var(--color-primary)]">
              Brabu&apos;s <span className="text-[var(--color-primary)]">Admin</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          {ADMIN_NAV_ITEMS.map((item) => (
            <AdminNavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 rounded-sm px-3 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
