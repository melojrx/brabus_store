import { Users } from "lucide-react"
import CustomersManager from "./CustomersManager"
import prisma from "@/lib/prisma"
import { serializeCustomer } from "@/lib/customers"

export default async function AdminCustomersPage() {
  const [customers, totalItems] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.customer.count(),
  ])

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-8 h-8 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-heading tracking-wider uppercase">Clientes</h1>
      </div>
      <CustomersManager
        initialData={customers.map(serializeCustomer)}
        initialMeta={{ page: 1, pageSize: 20, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / 20)) }}
      />
    </div>
  )
}
