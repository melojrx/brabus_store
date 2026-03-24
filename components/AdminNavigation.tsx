"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronLeft,
  House,
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
  collapsed = false,
}: AdminNavItem & {
  pathname: string
  onClick?: () => void
  collapsed?: boolean
}) {
  const isActive = isItemActive(pathname, href)

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-sm px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
        collapsed ? "justify-center" : ""
      } ${isActive ? "bg-[var(--color-primary)]/15 text-white" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
    >
      <Icon className={`h-5 w-5 ${isActive ? "text-[var(--color-primary)]" : "text-gray-400"}`} />
      <span className={collapsed ? "sr-only" : "ml-3"}>{label}</span>
    </Link>
  )
}

export default function AdminNavigation() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const mobileNavId = useId()
  const currentItem = ADMIN_NAV_ITEMS.find((item) => isItemActive(pathname, item.href)) ?? ADMIN_NAV_ITEMS[0]
  const CurrentItemIcon = currentItem.icon

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
            aria-controls={mobileNavId}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Fechar menu admin" : "Abrir menu admin"}
            onClick={() => setMenuOpen((current) => !current)}
            className="rounded-sm border border-white/10 p-2 text-gray-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div className="border-t border-white/5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Seção atual</p>
              <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2 text-sm font-medium text-white">
                <CurrentItemIcon className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                <span className="truncate">{currentItem.label}</span>
              </div>
            </div>

            <Link
              href="/"
              className="shrink-0 rounded-sm border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Loja
            </Link>
          </div>
        </div>

        {menuOpen ? (
          <div id={mobileNavId} className="border-t border-white/5 px-4 py-4">
            <nav aria-label="Admin mobile" className="space-y-2">
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
                href="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center rounded-sm border border-white/10 px-3 py-3 text-sm font-medium text-gray-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                Voltar para a loja
              </Link>

              <Link
                href="/api/auth/signout"
                onClick={() => setMenuOpen(false)}
                className="mt-2 flex items-center gap-3 rounded-sm px-3 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
              >
                <LogOut className="h-5 w-5" />
                <span>Sair</span>
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <aside
        className={`hidden shrink-0 flex-col border-r border-white/5 bg-zinc-950 transition-[width] duration-200 md:flex ${
          desktopCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className={`border-b border-white/5 ${desktopCollapsed ? "p-4" : "p-6"}`}>
          <div className={`flex items-center gap-3 ${desktopCollapsed ? "justify-center" : "justify-between"}`}>
            <Link href="/" className={`block min-w-0 ${desktopCollapsed ? "hidden" : ""}`}>
              <span className="text-xl font-heading tracking-wider uppercase text-white transition-colors hover:text-[var(--color-primary)]">
                Brabu&apos;s <span className="text-[var(--color-primary)]">Admin</span>
              </span>
            </Link>

            <button
              type="button"
              aria-expanded={!desktopCollapsed}
              aria-label={desktopCollapsed ? "Expandir sidebar do admin" : "Recolher sidebar do admin"}
              title={desktopCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
              onClick={() => setDesktopCollapsed((current) => !current)}
              className="rounded-sm border border-white/10 p-2 text-gray-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <ChevronLeft className={`h-4 w-4 transition-transform ${desktopCollapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          {desktopCollapsed ? (
            <Link
              href="/"
              aria-label="Voltar para a loja"
              title="Voltar para a loja"
              className="mt-4 flex justify-center rounded-sm border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:border-white/30 hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <House className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        <nav aria-label="Admin desktop" className={`flex-1 space-y-1 ${desktopCollapsed ? "px-2 py-4" : "px-3 py-6"}`}>
          {ADMIN_NAV_ITEMS.map((item) => (
            <AdminNavLink key={item.href} {...item} pathname={pathname} collapsed={desktopCollapsed} />
          ))}
        </nav>

        <div className={`border-t border-white/5 ${desktopCollapsed ? "px-2 py-4" : "px-3 py-4"}`}>
          <Link
            href="/api/auth/signout"
            aria-label={desktopCollapsed ? "Sair" : undefined}
            title={desktopCollapsed ? "Sair" : undefined}
            className={`flex items-center rounded-sm px-3 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
              desktopCollapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="h-5 w-5" />
            <span className={desktopCollapsed ? "sr-only" : "ml-3"}>Sair</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
