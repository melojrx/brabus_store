import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Users } from "lucide-react"
import prisma from "@/lib/prisma"

export default async function AdminCustomers() {
  const session = await auth()
  if (!session || session.user?.role !== "ADMIN") redirect("/")

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-8 h-8 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-heading tracking-wider uppercase">Clientes</h1>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-black text-gray-400 tracking-widest">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Pedidos</th>
              <th className="px-6 py-4">Membro desde</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                <td className="px-6 py-4 text-gray-400">{c.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-sm text-xs font-bold ${c._count.orders > 0 ? "bg-green-500/20 text-green-400" : "bg-white/5 text-gray-500"}`}>
                    {c._count.orders}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400 text-xs">
                  {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Nenhum cliente cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
