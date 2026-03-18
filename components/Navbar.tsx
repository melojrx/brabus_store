"use client"

import Link from "next/link"
import { ShoppingCart, LogIn, User, Menu, X } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useSession } from "next-auth/react"
import { useState } from "react"

export default function Navbar() {
  const { getItemCount, hasHydrated } = useCartStore()
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const itemCount = hasHydrated ? getItemCount() : 0

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
          <Link
            href={session ? "/account" : "/auth/login"}
            className="hover:text-[var(--color-primary)] transition-colors"
            title={session ? `Olá, ${session.user?.name}` : "Entrar"}
          >
            {session ? <User className="w-5 h-5 text-[var(--color-primary)]" /> : <LogIn className="w-5 h-5" />}
          </Link>

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
          <Link href={session ? "/account" : "/auth/login"} onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-[var(--color-primary)] uppercase tracking-widest py-2">
            {session ? "Minha Conta" : "Entrar / Cadastrar"}
          </Link>
        </div>
      )}
    </nav>
  )
}
