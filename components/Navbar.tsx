"use client"

import Link from "next/link"
import { ShoppingCart, LogIn, User, Menu, X, Settings, LogOut } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"

export default function Navbar() {
  const { getItemCount, hasHydrated } = useCartStore()
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const itemCount = hasHydrated ? getItemCount() : 0
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN"
  const actionButtonClassName =
    "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-gray-300 transition-all duration-200 hover:border-[var(--color-primary)]/40 hover:bg-white/[0.08] hover:text-white"

  useEffect(() => {
    if (!accountMenuOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [accountMenuOpen])

  useEffect(() => {
    if (!accountMenuOpen && !menuOpen) {
      return
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return
      }

      setAccountMenuOpen(false)
      setMenuOpen(false)
    }

    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [accountMenuOpen, menuOpen])

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5 py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span className="text-2xl font-heading tracking-wider uppercase text-white group-hover:text-[var(--color-primary)] transition-colors">
            Brabu&apos;s <span className="text-[var(--color-primary)]">Store</span>
          </span>
        </Link>

        {/* Nav Links - Desktop */}
        <div className="hidden items-center gap-5 md:flex lg:gap-6">
          <Link href="/products" className="text-sm font-medium text-gray-300 hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Produtos</Link>
          <Link href="/loja" className="text-sm font-medium text-gray-300 hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Loja Física</Link>
          <Link href="/contato" className="text-sm font-medium text-gray-300 hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Contato</Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Account Link */}
          {session ? (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  setAccountMenuOpen((current) => !current)
                }}
                className={`${actionButtonClassName} text-[var(--color-primary)]`}
                title={`Olá, ${session.user?.name}`}
                aria-label="Abrir menu da conta"
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
              >
                <User className="w-5 h-5" />
              </button>

              {accountMenuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 min-w-[210px] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-md">
                  <div className="border-b border-white/5 px-3 py-2">
                    <p className="truncate text-sm font-medium text-white">{session.user?.name}</p>
                    <p className="truncate text-xs text-zinc-500">{session.user?.email}</p>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/account"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <User className="h-4 w-4" /> Minha conta
                    </Link>

                    {isAdmin ? (
                      <Link
                        href="/admin"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <Settings className="h-4 w-4" /> Painel Admin
                      </Link>
                    ) : null}

                    <Link
                      href="/api/auth/signout"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className={actionButtonClassName}
              title="Entrar"
              aria-label="Entrar"
            >
              <LogIn className="w-5 h-5" />
            </Link>
          )}

          {/* Cart */}
          <Link href="/cart" className={`${actionButtonClassName} relative`} aria-label="Abrir carrinho">
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-secondary)] px-1 text-[10px] font-bold text-white">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className={`${actionButtonClassName} md:hidden`}
            onClick={() => {
              setAccountMenuOpen(false)
              setMenuOpen((current) => !current)
            }}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="space-y-4 border-t border-white/5 bg-black/90 px-4 pb-4 pt-3 backdrop-blur-md md:hidden">
          <Link href="/products" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-gray-300 hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest py-2">Produtos</Link>
          <Link href="/loja" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-gray-300 hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest py-2">Loja Física</Link>
          <Link href="/contato" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-gray-300 hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest py-2">Contato</Link>
          {session ? (
            <div className="space-y-1 rounded-xl border border-white/10 bg-zinc-950/80 p-3">
              <p className="truncate text-sm font-medium text-white">{session.user?.name}</p>
              <p className="truncate text-xs text-zinc-500">{session.user?.email}</p>

              <div className="pt-3 space-y-1">
                <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5 hover:text-white">
                  <User className="h-4 w-4" /> Minha conta
                </Link>
                {isAdmin ? (
                  <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5 hover:text-white">
                    <Settings className="h-4 w-4" /> Painel Admin
                  </Link>
                ) : null}
                <Link href="/api/auth/signout" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200">
                  <LogOut className="h-4 w-4" /> Sair
                </Link>
              </div>
            </div>
          ) : (
            <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-[var(--color-primary)] uppercase tracking-widest py-2">
              Entrar / Cadastrar
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
