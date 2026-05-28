import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { Webhook } from "lucide-react"
import prisma from "@/lib/prisma"
import DeliveriesManager from "./DeliveriesManager"

export default async function WebhookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session || session.user?.role !== "ADMIN") {
    redirect(session?.user?.role === "SELLER" ? "/admin/pdv" : "/")
  }

  const { id } = await params
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      active: true,
    },
  })

  if (!endpoint) notFound()

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Webhook className="w-6 h-6 text-[var(--color-primary)]" />
        <h1 className="text-2xl font-heading tracking-wider uppercase">{endpoint.name}</h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            endpoint.active ? "bg-emerald-900/50 text-emerald-400" : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {endpoint.active ? "Ativo" : "Inativo"}
        </span>
      </div>
      <p className="text-sm text-zinc-500 mb-6 truncate">{endpoint.url}</p>
      <DeliveriesManager endpointId={endpoint.id} />
    </div>
  )
}
