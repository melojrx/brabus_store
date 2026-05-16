import { User } from "lucide-react"
import UsersManager from "./UsersManager"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"

export default async function AdminUsersPage() {
  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SELLER] } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
        seller: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.count({ where: { role: { in: [Role.ADMIN, Role.SELLER] } } }),
  ])

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }))

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <User className="w-8 h-8 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-heading tracking-wider uppercase">Usuários</h1>
      </div>
      <UsersManager
        initialData={serialized}
        initialMeta={{ page: 1, pageSize: 20, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / 20)) }}
      />
    </div>
  )
}
