import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { KeyRound } from "lucide-react"
import ApiKeysManager from "./ApiKeysManager"
import prisma from "@/lib/prisma"

export default async function AdminApiKeysPage() {
  const session = await auth()

  if (!session || session.user?.role !== "ADMIN") {
    redirect(session?.user?.role === "SELLER" ? "/admin/pdv" : "/")
  }

  const keys = await prisma.integrationApiKey.findMany({
    select: {
      id: true,
      name: true,
      actor: true,
      scopes: true,
      active: true,
      lastUsedAt: true,
      createdAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const serializedKeys = keys.map((key) => ({
    ...key,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    revokedAt: key.revokedAt?.toISOString() ?? null,
  }))

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <KeyRound className="w-8 h-8 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-heading tracking-wider uppercase">API Keys</h1>
      </div>
      <ApiKeysManager initialKeys={serializedKeys} />
    </div>
  )
}
