import { UserCheck } from "lucide-react"
import SellersManager from "./SellersManager"
import prisma from "@/lib/prisma"
import { serializeSeller } from "@/lib/sellers"

export default async function AdminSellersPage() {
  const [sellers, totalItems] = await Promise.all([
    prisma.seller.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.seller.count(),
  ])

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <UserCheck className="w-8 h-8 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-heading tracking-wider uppercase">Vendedores</h1>
      </div>
      <SellersManager
        initialData={sellers.map(serializeSeller)}
        initialMeta={{ page: 1, pageSize: 20, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / 20)) }}
      />
    </div>
  )
}
