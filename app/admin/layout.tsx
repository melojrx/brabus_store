import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Package, Tags, Settings, LogOut, Users, Truck } from "lucide-react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user?.role !== "ADMIN") {
    redirect('/')
  }

  return (
    <div className="flex bg-black min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-white/5 hidden md:flex flex-col">
        <div className="p-6 border-b border-white/5">
           <Link href="/" className="block">
             <span className="text-xl font-heading tracking-wider uppercase text-white hover:text-[var(--color-primary)] transition-colors">
               Brabu's <span className="text-[var(--color-primary)]">Admin</span>
             </span>
           </Link>
        </div>

        <nav className="flex-1 py-6 space-y-1 px-3">
           <Link href="/admin" className="flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-sm transition-colors font-medium text-sm">
             <LayoutDashboard className="w-5 h-5 text-gray-400" /> Dashboard
           </Link>
           <Link href="/admin/products" className="flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-sm transition-colors font-medium text-sm">
             <Package className="w-5 h-5 text-gray-400" /> Produtos
           </Link>
           <Link href="/admin/categories" className="flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-sm transition-colors font-medium text-sm">
             <Tags className="w-5 h-5 text-gray-400" /> Categorias
           </Link>
           <Link href="/admin/customers" className="flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-sm transition-colors font-medium text-sm">
             <Users className="w-5 h-5 text-gray-400" /> Clientes
           </Link>
           <Link href="/admin/shipping" className="flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-sm transition-colors font-medium text-sm">
             <Truck className="w-5 h-5 text-gray-400" /> Entrega
           </Link>
           <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-sm transition-colors font-medium text-sm">
             <Settings className="w-5 h-5 text-gray-400" /> Configurações
           </Link>
        </nav>

        <div className="p-4 border-t border-white/5">
           <Link href="/api/auth/signout" className="flex items-center gap-3 px-3 py-3 text-red-400 hover:bg-red-400/10 rounded-sm transition-colors font-medium text-sm">
             <LogOut className="w-5 h-5" /> Sair
           </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 bg-background overflow-y-auto">
        <div className="p-8">
           {children}
        </div>
      </main>
    </div>
  )
}
