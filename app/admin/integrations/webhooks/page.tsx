import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Webhook } from "lucide-react"
import WebhooksManager from "./WebhooksManager"
import prisma from "@/lib/prisma"

export default async function AdminWebhooksPage() {
  const session = await auth()

  if (!session || session.user?.role !== "ADMIN") {
    redirect(session?.user?.role === "SELLER" ? "/admin/pdv" : "/")
  }

  const endpoints = await prisma.webhookEndpoint.findMany({
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const serialized = endpoints.map((ep) => ({
    ...ep,
    createdAt: ep.createdAt.toISOString(),
    updatedAt: ep.updatedAt.toISOString(),
  }))

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Webhook className="w-8 h-8 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-heading tracking-wider uppercase">Webhooks</h1>
      </div>
      <WebhooksManager initialEndpoints={serialized} />
    </div>
  )
}
