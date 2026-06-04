"use client"

import { useEffect, useState } from "react"
import { Copy, KeyRound, Loader2, Plus, ShieldOff, AlertTriangle } from "lucide-react"
import AdminInlineFeedback, { type AdminInlineFeedbackState } from "@/components/admin/AdminInlineFeedback"

type ApiKeyRecord = {
  id: string
  name: string
  actor: string
  scopes: string[]
  active: boolean
  lastUsedAt: string | null
  createdAt: string
  revokedAt: string | null
}

const AVAILABLE_SCOPES = [
  { value: "read:dashboard", label: "Dashboard (leitura)" },
  { value: "read:orders", label: "Pedidos (leitura)" },
  { value: "read:products", label: "Produtos (leitura)" },
  { value: "write:products", label: "Produtos (escrita)" },
  { value: "read:stock", label: "Estoque (leitura)" },
  { value: "write:stock", label: "Estoque (escrita)" },
  { value: "read:categories", label: "Categorias (leitura)" },
  { value: "read:customers", label: "Clientes (leitura)" },
  { value: "read:suppliers", label: "Fornecedores (leitura)" },
  { value: "read:sellers", label: "Vendedores (leitura)" },
  { value: "read:settings", label: "Configurações (leitura)" },
] as const

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso))
}

export default function ApiKeysManager({ initialKeys }: { initialKeys: ApiKeyRecord[] }) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>(initialKeys)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createdPlainKey, setCreatedPlainKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<AdminInlineFeedbackState>(null)
  const [loading, setLoading] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const [formName, setFormName] = useState("")
  const [formActor, setFormActor] = useState("")
  const [formScopes, setFormScopes] = useState<string[]>([])

  useEffect(() => {
    if (feedback?.type !== "success") return
    const id = window.setTimeout(() => setFeedback(null), 5000)
    return () => window.clearTimeout(id)
  }, [feedback])

  function resetForm() {
    setFormName("")
    setFormActor("")
    setFormScopes([])
    setShowCreateForm(false)
  }

  function toggleScope(scope: string) {
    setFormScopes((current) =>
      current.includes(scope)
        ? current.filter((s) => s !== scope)
        : [...current, scope],
    )
  }

  async function handleCreate() {
    if (!formName.trim() || !formActor.trim() || formScopes.length === 0) {
      setFeedback({ type: "error", message: "Preencha nome, actor e ao menos um scope." })
      return
    }

    setLoading(true)
    setFeedback(null)

    try {
      const res = await fetch("/api/admin/integrations/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          actor: formActor.trim(),
          scopes: formScopes,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Erro ao criar API key." })
        return
      }

      setKeys((current) => [data.data.apiKey, ...current])
      setCreatedPlainKey(data.data.plainTextKey)
      resetForm()
      setFeedback({ type: "success", message: "API key criada com sucesso." })
    } catch {
      setFeedback({ type: "error", message: "Erro de conexão." })
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id)
    setFeedback(null)

    try {
      const res = await fetch(`/api/admin/integrations/api-keys/${id}/revoke`, {
        method: "PATCH",
      })

      if (!res.ok) {
        const data = await res.json()
        setFeedback({ type: "error", message: data.error || "Erro ao revogar." })
        return
      }

      setKeys((current) =>
        current.map((key) =>
          key.id === id
            ? { ...key, active: false, revokedAt: new Date().toISOString() }
            : key,
        ),
      )
      setFeedback({ type: "success", message: "API key revogada." })
    } catch {
      setFeedback({ type: "error", message: "Erro de conexão." })
    } finally {
      setRevoking(null)
    }
  }

  async function handleCopy() {
    if (!createdPlainKey) return
    await navigator.clipboard.writeText(createdPlainKey)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <AdminInlineFeedback feedback={feedback} />

      {/* Created key banner */}
      {createdPlainKey ? (
        <div className="rounded-sm border border-yellow-500/30 bg-yellow-500/10 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-yellow-200">
                Guarde agora. Esta chave não será exibida novamente.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="block flex-1 overflow-x-auto rounded-sm bg-black/50 px-3 py-2 text-xs text-white font-mono">
                  {createdPlainKey}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 rounded-sm border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-white/30"
                >
                  <Copy className="h-4 w-4 inline mr-1" />
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreatedPlainKey(null)}
            className="text-xs text-yellow-300/70 hover:text-yellow-200 transition-colors"
          >
            Fechar aviso
          </button>
        </div>
      ) : null}

      {/* Create form toggle */}
      {!showCreateForm ? (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 rounded-sm bg-[var(--color-primary)] px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          <Plus className="h-4 w-4" /> Nova API Key
        </button>
      ) : (
        <div className="rounded-sm border border-white/5 bg-zinc-900 p-6 space-y-5">
          <h2 className="text-lg font-heading tracking-wider uppercase text-white">Criar API Key</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-admin">Nome</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Neo Júnior"
                className="input-admin"
              />
            </div>
            <div>
              <label className="label-admin">Actor</label>
              <input
                type="text"
                value={formActor}
                onChange={(e) => setFormActor(e.target.value)}
                placeholder="Ex: neo:junior"
                className="input-admin"
              />
            </div>
          </div>

          <div>
            <label className="label-admin">Scopes</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {AVAILABLE_SCOPES.map((scope) => (
                <label
                  key={scope.value}
                  className="flex items-center gap-2 cursor-pointer text-sm text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={formScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className="h-4 w-4 rounded border-white/20 bg-zinc-800 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  {scope.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-2 rounded-sm bg-[var(--color-primary)] px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Criar
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-sm border border-white/10 px-4 py-3 text-sm font-bold uppercase tracking-widest text-gray-300 transition-colors hover:border-white/30 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Keys table */}
      <div className="rounded-sm border border-white/5 bg-zinc-900 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-xs uppercase tracking-[0.2em] text-gray-400">
            <tr>
              <th className="px-4 py-4">Nome</th>
              <th className="px-4 py-4">Actor</th>
              <th className="px-4 py-4">Scopes</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Último uso</th>
              <th className="px-4 py-4">Criada em</th>
              <th className="px-4 py-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-4 font-medium text-white">{key.name}</td>
                <td className="px-4 py-4 text-gray-300 font-mono text-xs">{key.actor}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {key.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400"
                      >
                        {scope.replace("read:", "")}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {key.active ? (
                    <span className="rounded-full bg-green-500/15 border border-green-500/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-300">
                      Ativa
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
                      Revogada
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-gray-400 text-xs">{formatDate(key.lastUsedAt)}</td>
                <td className="px-4 py-4 text-gray-400 text-xs">{formatDate(key.createdAt)}</td>
                <td className="px-4 py-4">
                  {key.active ? (
                    <button
                      type="button"
                      onClick={() => handleRevoke(key.id)}
                      disabled={revoking === key.id}
                      className="flex items-center gap-1 rounded-sm border border-red-500/30 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {revoking === key.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ShieldOff className="h-3 w-3" />
                      )}
                      Revogar
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}

            {keys.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  Nenhuma API key criada ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
