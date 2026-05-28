"use client"

import { useEffect, useState } from "react"
import { Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react"
import AdminInlineFeedback, { type AdminInlineFeedbackState } from "@/components/admin/AdminInlineFeedback"

type DeliveryRecord = {
  id: string
  event: string
  httpStatus: number | null
  success: boolean
  attempts: number
  lastAttemptAt: string | null
  nextRetryAt: string | null
  createdAt: string
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso))
}

export default function DeliveriesManager({ endpointId }: { endpointId: string }) {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [feedback, setFeedback] = useState<AdminInlineFeedbackState>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  useEffect(() => {
    if (feedback?.type !== "success") return
    const id = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(id)
  }, [feedback])

  useEffect(() => {
    fetchDeliveries()
  }, [page])

  async function fetchDeliveries() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/integrations/webhooks/${endpointId}/deliveries?page=${page}&pageSize=20`,
      )
      const json = await res.json()
      setDeliveries(json.data ?? [])
      setTotalPages(json.meta?.totalPages ?? 1)
    } catch {
      setFeedback({ type: "error", message: "Erro ao carregar deliveries." })
    } finally {
      setLoading(false)
    }
  }

  async function handleRetry(deliveryId: string) {
    setRetrying(deliveryId)
    try {
      const res = await fetch(
        `/api/admin/integrations/webhooks/${endpointId}/deliveries/${deliveryId}/retry`,
        { method: "POST" },
      )
      const json = await res.json()

      if (json.success) {
        setFeedback({ type: "success", message: "Reenvio bem-sucedido!" })
        setDeliveries((prev) =>
          prev.map((d) => (d.id === deliveryId ? { ...d, success: true } : d)),
        )
      } else {
        setFeedback({ type: "error", message: "Reenvio falhou." })
      }
    } catch {
      setFeedback({ type: "error", message: "Erro de rede." })
    } finally {
      setRetrying(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Histórico de Deliveries</h2>
        <button
          onClick={fetchDeliveries}
          className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <AdminInlineFeedback feedback={feedback} />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : deliveries.length === 0 ? (
        <p className="text-zinc-500 text-sm">Nenhuma delivery registrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-white/5">
                <th className="pb-2 pr-4">Evento</th>
                <th className="pb-2 pr-4">Status HTTP</th>
                <th className="pb-2 pr-4">Resultado</th>
                <th className="pb-2 pr-4">Tentativas</th>
                <th className="pb-2 pr-4">Último envio</th>
                <th className="pb-2 pr-4">Criado em</th>
                <th className="pb-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id} className="border-b border-white/5">
                  <td className="py-2 pr-4 text-zinc-300">{d.event}</td>
                  <td className="py-2 pr-4 text-zinc-400">{d.httpStatus ?? "—"}</td>
                  <td className="py-2 pr-4">
                    {d.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </td>
                  <td className="py-2 pr-4 text-zinc-400">{d.attempts}</td>
                  <td className="py-2 pr-4 text-zinc-500 text-xs">{formatDate(d.lastAttemptAt)}</td>
                  <td className="py-2 pr-4 text-zinc-500 text-xs">{formatDate(d.createdAt)}</td>
                  <td className="py-2">
                    {!d.success && (
                      <button
                        onClick={() => handleRetry(d.id)}
                        disabled={retrying === d.id}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                        title="Reenviar"
                      >
                        {retrying === d.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 text-xs"
          >
            Anterior
          </button>
          <span className="text-xs text-zinc-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 text-xs"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  )
}
