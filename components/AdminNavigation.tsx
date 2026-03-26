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
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"

type AdminNavItem = {
  href?: string
  label: string
  icon: LucideIcon
  disabled?: boolean
}

type AdminNavSection = {
  label?: string
  items: AdminNavItem[]
}

const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/pdv", label: "PDV", icon: ShoppingBasket },
      { href: "/admin/orders", label: "Pedidos", icon: Receipt },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { href: "/admin/products", label: "Produtos", icon: Package },
      { href: "/admin/categories", label: "Categorias", icon: Tags },
      { href: "/admin/customers", label: "Clientes", icon: Users },
      { label: "Usuários", icon: User, disabled: true },
    ],
  },
  {
    label: "Configurações",
    items: [
      { href: "/admin/settings", label: "Geral", icon: Settings },
      { href: "/admin/shipping", label: "Entregas", icon: Truck },
    ],
  },
]

const ADMIN_NAV_ITEMS = ADMIN_NAV_SECTIONS.flatMap((section) => section.items)

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
  disabled,
  pathname,
  onClick,
  collapsed = false,
}: AdminNavItem & {
  pathname: string
  onClick?: () => void
  collapsed?: boolean
}) {
  const isActive = href ? isItemActive(pathname, href) : false
  const commonClassName = `flex items-center rounded-sm px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
    collapsed ? "justify-center" : ""
  }`
  const iconClassName = `h-5 w-5 ${isActive ? "text-[var(--color-primary)]" : "text-gray-400"}`

  if (!href || disabled) {
    return (
      <div
        aria-disabled="true"
        aria-label={collapsed ? label : undefined}
        title={collapsed ? label : undefined}
        className={`${commonClassName} cursor-not-allowed border border-dashed border-white/10 text-gray-500 opacity-70 ${
          collapsed ? "" : "justify-between gap-3"
        }`}
      >
        <div className={`flex items-center ${collapsed ? "justify-center" : ""}`}>
          <Icon className={iconClassName} />
          <span className={collapsed ? "sr-only" : "ml-3"}>{label}</span>
        </div>
        {collapsed ? null : (
          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
            Em breve
          </span>
        )}
      </div>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={`${commonClassName} ${isActive ? "bg-[var(--color-primary)]/15 text-white" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
    >
      <Icon className={iconClassName} />
      <span className={collapsed ? "sr-only" : "ml-3"}>{label}</span>
    </Link>
  )
}

export default function AdminNavigation() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const mobileNavId = useId()
  const currentItem = ADMIN_NAV_ITEMS.find((item) => item.href && isItemActive(pathname, item.href)) ?? ADMIN_NAV_ITEMS[0]
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
            <nav aria-label="Admin mobile" className="space-y-4">
              {ADMIN_NAV_SECTIONS.map((section, sectionIndex) => (
                <div key={section.label ?? `mobile-section-${sectionIndex}`}>
                  {section.label ? (
                    <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">{section.label}</p>
                  ) : null}

                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <AdminNavLink
                        key={item.href ?? item.label}
                        {...item}
                        pathname={pathname}
                        onClick={() => setMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>
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

        <nav aria-label="Admin desktop" className={`flex-1 ${desktopCollapsed ? "px-2 py-4" : "px-3 py-6"}`}>
          <div className="space-y-6">
            {ADMIN_NAV_SECTIONS.map((section, sectionIndex) => (
              <div key={section.label ?? `desktop-section-${sectionIndex}`}>
                {!desktopCollapsed && section.label ? (
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">{section.label}</p>
                ) : null}

                <div className="space-y-1">
                  {section.items.map((item) => (
                    <AdminNavLink
                      key={item.href ?? item.label}
                      {...item}
                      pathname={pathname}
                      collapsed={desktopCollapsed}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div>
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
          </div>
        </nav>

        <div className={`border-t border-white/5 ${desktopCollapsed ? "px-2 py-4" : "px-3 py-4"}`} />
      </aside>
    </>
  )
}
