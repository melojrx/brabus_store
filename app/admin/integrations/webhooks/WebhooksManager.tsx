"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2, Send, ToggleLeft, ToggleRight } from "lucide-react"
import AdminInlineFeedback, { type AdminInlineFeedbackState } from "@/components/admin/AdminInlineFeedback"
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events"

type EndpointRecord = {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

const EVENT_LABELS: Record<string, string> = {
  "order.paid": "Pedido Pago",
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso))
}

export default function WebhooksManager({ initialEndpoints }: { initialEndpoints: EndpointRecord[] }) {
  const [endpoints, setEndpoints] = useState<EndpointRecord[]>(initialEndpoints)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [feedback, setFeedback] = useState<AdminInlineFeedbackState>(null)
  const [loading, setLoading] = useState(false)
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)

  const [formName, setFormName] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formEvents, setFormEvents] = useState<string[]>([])

  useEffect(() => {
    if (feedback?.type !== "success") return
    const id = window.setTimeout(() => setFeedback(null), 5000)
    return () => window.clearTimeout(id)
  }, [feedback])

  function resetForm() {
    setFormName("")
    setFormUrl("")
    setFormEvents([])
    setShowCreateForm(false)
    setCreatedSecret(null)
  }

  function toggleEvent(event: string) {
    setFormEvents((current) =>
      current.includes(event) ? current.filter((e) => e !== event) : [...current, event],
    )
  }

  async function handleCreate() {
    if (!formName.trim() || !formUrl.trim() || formEvents.length === 0) {
      setFeedback({ type: "error", message: "Preencha nome, URL e ao menos um evento." })
      return
    }

    setLoading(true)
    setFeedback(null)

    try {
      const res = await fetch("/api/admin/integrations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, url: formUrl, events: formEvents }),
      })

      const json = await res.json()

      if (!res.ok) {
        setFeedback({ type: "error", message: json.error ?? "Erro ao criar endpoint." })
        return
      }

      setCreatedSecret(json.data.secret)
      setEndpoints((prev) => [
        {
          id: json.data.id,
          name: json.data.name,
          url: json.data.url,
          events: json.data.events,
          active: json.data.active,
          createdAt: json.data.createdAt,
          updatedAt: json.data.createdAt,
        },
        ...prev,
      ])
      setFeedback({ type: "success", message: "Endpoint criado. Copie o secret abaixo." })
    } catch {
      setFeedback({ type: "error", message: "Erro de rede." })
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(id: string, active: boolean) {
    const res = await fetch(`/api/admin/integrations/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    })

    if (res.ok) {
      setEndpoints((prev) => prev.map((ep) => (ep.id === id ? { ...ep, active: !active } : ep)))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este endpoint e todo o histórico de deliveries?")) return

    const res = await fetch(`/api/admin/integrations/webhooks/${id}`, { method: "DELETE" })

    if (res.ok) {
      setEndpoints((prev) => prev.filter((ep) => ep.id !== id))
      setFeedback({ type: "success", message: "Endpoint excluído." })
    }
  }

  async function handleTest(id: string) {
    const res = await fetch(`/api/admin/integrations/webhooks/${id}/test`, { method: "POST" })
    const json = await res.json()

    if (json.success) {
      setFeedback({ type: "success", message: "Ping enviado com sucesso!" })
    } else {
      setFeedback({ type: "error", message: "Ping falhou. Verifique a URL e o servidor destino." })
    }
  }

  return (
    <div className="space-y-6">
      <AdminInlineFeedback feedback={feedback} />

      {createdSecret && (
        <div className="p-4 rounded-lg bg-emerald-900/30 border border-emerald-500/30">
          <p className="text-sm text-emerald-300 mb-2 font-medium">
            Secret do endpoint (copie agora, não será exibido novamente):
          </p>
          <code className="block p-2 bg-black/40 rounded text-xs break-all select-all">
            {createdSecret}
          </code>
          <button
            onClick={() => setCreatedSecret(null)}
            className="mt-2 text-xs text-zinc-400 hover:text-white"
          >
            Fechar
          </button>
        </div>
      )}

      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-black font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Novo Endpoint
        </button>
      ) : (
        <div className="p-4 rounded-lg border border-white/5 bg-zinc-900 space-y-4">
          <div>
            <label className="label-admin">Nome</label>
            <input
              className="input-admin"
              placeholder="Ex: Hermes Agent"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>
          <div>
            <label className="label-admin">URL</label>
            <input
              className="input-admin"
              placeholder="https://hermes.example.com/webhook"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="label-admin">Eventos</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {WEBHOOK_EVENTS.map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => toggleEvent(event)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    formEvents.includes(event)
                      ? "bg-[var(--color-primary)] text-black"
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {EVENT_LABELS[event] ?? event}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-black font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {endpoints.length === 0 && (
          <p className="text-zinc-500 text-sm">Nenhum endpoint cadastrado.</p>
        )}
        {endpoints.map((ep) => (
          <div
            key={ep.id}
            className="p-4 rounded-lg border border-white/5 bg-zinc-900 flex items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white truncate">{ep.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    ep.active ? "bg-emerald-900/50 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {ep.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate mt-0.5">{ep.url}</p>
              <div className="flex gap-1 mt-1">
                {ep.events.map((event) => (
                  <span key={event} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                    {EVENT_LABELS[event] ?? event}
                  </span>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-1">Criado em {formatDate(ep.createdAt)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleTest(ep.id)}
                title="Enviar ping de teste"
                className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleToggle(ep.id, ep.active)}
                title={ep.active ? "Desativar" : "Ativar"}
                className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                {ep.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
              <a
                href={`/admin/integrations/webhooks/${ep.id}`}
                className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs"
              >
                Deliveries
              </a>
              <button
                onClick={() => handleDelete(ep.id)}
                title="Excluir"
                className="p-2 rounded hover:bg-zinc-800 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
