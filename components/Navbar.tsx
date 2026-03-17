import Link from "next/link";
import { ShoppingCart, LogIn, Menu } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5 py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl font-heading tracking-wider uppercase text-white group-hover:text-[var(--color-primary)] transition-colors">
            Brabu's <span className="text-[var(--color-primary)]">Store</span>
          </span>
        </Link>
        
        <div className="hidden md:flex gap-6 items-center">
          <Link href="/products" className="text-sm font-medium hover:text-[var(--color-primary)] transition-colors">Pordutos</Link>
          <Link href="/loja" className="text-sm font-medium hover:text-[var(--color-primary)] transition-colors">Loja Física</Link>
          <Link href="/contato" className="text-sm font-medium hover:text-[var(--color-primary)] transition-colors">Contato</Link>
        </div>

        <div className="flex gap-4 items-center">
          <Link href="/account" className="hover:text-[var(--color-primary)] transition-colors">
            <LogIn className="w-5 h-5" />
          </Link>
          <Link href="/cart" className="relative hover:text-[var(--color-primary)] transition-colors">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 bg-[var(--color-secondary)] text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">0</span>
          </Link>
          <button className="md:hidden">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
}
