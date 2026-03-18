import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Package, LogOut, Settings } from "lucide-react"
import Link from "next/link"
import prisma from "@/lib/prisma"

export default async function AccountPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/account')
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <div className="flex flex-col md:flex-row items-center justify-between mb-12 border-b border-white/10 pb-8 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading tracking-wider uppercase mb-2">Minha <span className="text-[var(--color-primary)]">Conta</span></h1>
          <p className="text-gray-400">Bem-vindo, {session.user.name}</p>
        </div>
        <div className="flex gap-4">
          {(session.user as any).role === 'ADMIN' && (
             <Link href="/admin" className="bg-[var(--color-primary)] text-black font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-sm flex items-center gap-2">
               <Settings className="w-4 h-4" /> Painel Admin
             </Link>
          )}
          <Link href="/api/auth/signout" className="border border-white/20 text-white font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-sm hover:bg-white/5 transition-colors flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Sair
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         <div className="md:col-span-1 border-r border-white/5 pr-4 hidden md:block">
            <nav className="space-y-2">
               <Link href="/account" className="block px-4 py-3 bg-white/5 text-[var(--color-primary)] border-l-2 border-[var(--color-primary)] font-bold uppercase tracking-widest text-sm">Meus Pedidos</Link>
               <Link href="#" className="block px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white transition-colors border-l-2 border-transparent font-bold uppercase tracking-widest text-sm">Meus Dados</Link>
               <Link href="#" className="block px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white transition-colors border-l-2 border-transparent font-bold uppercase tracking-widest text-sm">Endereços</Link>
            </nav>
         </div>

         <div className="md:col-span-3">
            <h2 className="text-2xl font-heading tracking-wider uppercase mb-6 flex items-center gap-3">
              <Package className="w-6 h-6 text-[var(--color-primary)]" />
              Histórico de Pedidos
            </h2>

            {orders.length === 0 ? (
               <div className="glass p-8 text-center rounded-sm">
                  <p className="text-gray-400 mb-4">Você ainda não tem nenhum pedido.</p>
                  <Link href="/products" className="text-[var(--color-primary)] text-sm uppercase tracking-widest font-bold hover:underline">Ir para as compras</Link>
               </div>
            ) : (
               <div className="space-y-4">
                 {orders.map((order) => (
                    <div key={order.id} className="glass p-6 rounded-sm border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-white/20 transition-colors">
                      <div>
                        <span className="text-xs text-gray-400 font-mono mb-1 block">Pedido #{order.id.split('-')[0]}</span>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm ${
                            order.status === 'PAID' ? 'bg-green-500/20 text-green-500' :
                            order.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {order.status === 'PAID' ? 'Pago' : order.status}
                          </span>
                          <span className="text-sm text-gray-300">
                             {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="font-heading text-lg tracking-wider">R$ {order.total.toString().replace('.', ',')}</p>
                      </div>
                      
                      <Link href={`/account/orders/${order.id}`} className="text-xs uppercase font-bold tracking-widest border border-white/20 text-white hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] px-4 py-2 rounded-sm transition-colors text-center">
                         Ver Detalhes
                      </Link>
                    </div>
                 ))}
               </div>
            )}
         </div>
      </div>
    </div>
  )
}
