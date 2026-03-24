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
        <div className="hidden md:flex gap-6 items-center">
          <Link href="/products" className="text-sm font-medium text-gray-300 hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Produtos</Link>
          <Link href="/loja" className="text-sm font-medium text-gray-300 hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Loja Física</Link>
          <Link href="/contato" className="text-sm font-medium text-gray-300 hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Contato</Link>
        </div>

        {/* Actions */}
        <div className="flex gap-4 items-center">
          {/* Account Link */}
          {session ? (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((current) => !current)}
                className="flex items-center justify-center rounded-full text-[var(--color-primary)] transition-colors hover:text-white"
                title={`Olá, ${session.user?.name}`}
                aria-label="Abrir menu da conta"
                aria-expanded={accountMenuOpen}
              >
                <User className="w-5 h-5" />
              </button>

              {accountMenuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-3 min-w-[210px] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-md">
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
              className="hover:text-[var(--color-primary)] transition-colors"
              title="Entrar"
            >
              <LogIn className="w-5 h-5" />
            </Link>
          )}

          {/* Cart */}
          <Link href="/cart" className="relative hover:text-[var(--color-primary)] transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[var(--color-secondary)] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-gray-300 hover:text-white transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/5 mt-4 px-4 py-4 space-y-4 bg-black/90 backdrop-blur-md">
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
