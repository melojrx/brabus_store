import { Warehouse } from "lucide-react"
import SuppliersManager from "./SuppliersManager"
import prisma from "@/lib/prisma"
import { serializeSupplier } from "@/lib/suppliers"

export default async function AdminSuppliersPage() {
  const [suppliers, totalItems] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.supplier.count(),
  ])

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Warehouse className="w-8 h-8 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-heading tracking-wider uppercase">Fornecedores</h1>
      </div>
      <SuppliersManager
        initialData={suppliers.map(serializeSupplier)}
        initialMeta={{ page: 1, pageSize: 20, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / 20)) }}
      />
    </div>
  )
}
