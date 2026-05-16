"use client"

import { useEffect, useState } from "react"
import { Check, Copy, KeyRound, Loader2, Pencil, Plus, Search, UserMinus, X } from "lucide-react"
import AdminInlineFeedback, { type AdminInlineFeedbackState } from "@/components/admin/AdminInlineFeedback"

type UserRecord = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  mustChangePassword: boolean
  createdAt: string
  seller: { id: string; name: string } | null
}

type Meta = { page: number; pageSize: number; totalItems: number; totalPages: number }

type FormData = {
  name: string
  email: string
  phone: string
  role: string
}

const emptyForm: FormData = { name: "", email: "", phone: "", role: "SELLER" }

export default function UsersManager({
  initialData,
  initialMeta,
}: {
  initialData: UserRecord[]
  initialMeta: Meta
}) {
  const [users, setUsers] = useState(initialData)
  const [meta, setMeta] = useState(initialMeta)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [feedback, setFeedback] = useState<AdminInlineFeedbackState>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (feedback?.type !== "success" || createdPassword) return
    const t = window.setTimeout(() => setFeedback(null), 5000)
    return () => window.clearTimeout(t)
  }, [feedback, createdPassword])

  async function fetchUsers(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", "20")
      if (search) params.set("search", search)
      if (roleFilter) params.set("role", roleFilter)

      const res = await fetch(`/api/admin/users?${params}`)
      const json = await res.json()
      setUsers(json.data)
      setMeta(json.meta)
    } catch {
      setFeedback({ type: "error", message: "Erro ao buscar usuários." })
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchUsers(1)
  }

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setCreatedPassword(null)
    setShowForm(true)
  }

  function openEdit(user: UserRecord) {
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
    })
    setEditingId(user.id)
    setCreatedPassword(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setCreatedPassword(null)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setFeedback({ type: "error", message: "Nome é obrigatório." })
      return
    }
    if (!form.email.trim()) {
      setFeedback({ type: "error", message: "Email é obrigatório." })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const url = editingId ? `/api/admin/users/${editingId}` : "/api/admin/users"
      const method = editingId ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const json = await res.json()

      if (!res.ok) {
        setFeedback({ type: "error", message: json.error || "Erro ao salvar." })
        return
      }

      if (!editingId && json.temporaryPassword) {
        setCreatedPassword(json.temporaryPassword)
        setFeedback({ type: "success", message: "Usuário criado. Copie a senha temporária abaixo." })
      } else {
        setFeedback({ type: "success", message: "Usuário atualizado." })
        closeForm()
      }

      fetchUsers(meta.page)
    } catch {
      setFeedback({ type: "error", message: "Erro de conexão." })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(id: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST" })
      const json = await res.json()

      if (!res.ok) {
        setFeedback({ type: "error", message: json.error || "Erro ao resetar senha." })
        return
      }

      setCreatedPassword(json.temporaryPassword)
      setFeedback({ type: "success", message: "Senha resetada. Copie a nova senha temporária." })
    } catch {
      setFeedback({ type: "error", message: "Erro de conexão." })
    }
  }

  async function handleDeactivate(id: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json()
        setFeedback({ type: "error", message: json.error || "Erro ao desativar." })
        return
      }
      setFeedback({ type: "success", message: "Usuário desativado." })
      fetchUsers(meta.page)
    } catch {
      setFeedback({ type: "error", message: "Erro de conexão." })
    }
  }

  function copyPassword() {
    if (createdPassword) {
      navigator.clipboard.writeText(createdPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <AdminInlineFeedback feedback={feedback} />

      {/* Temporary password banner */}
      {createdPassword && (
        <div className="rounded-sm border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-200 font-bold mb-2">
            Senha temporária (exibida apenas uma vez):
          </p>
          <div className="flex items-center gap-3">
            <code className="rounded bg-black/50 px-3 py-2 text-sm font-mono text-white tracking-wider">
              {createdPassword}
            </code>
            <button
              type="button"
              onClick={copyPassword}
              className="flex items-center gap-1 rounded-sm border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-300 hover:border-white/30 hover:text-white transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-yellow-200/70 mt-2">
            O usuário será obrigado a trocar a senha no primeiro login.
          </p>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="input-admin pl-10 w-full"
            />
          </div>
          <button type="submit" className="rounded-sm bg-white/5 border border-white/10 px-4 py-3 text-sm font-bold uppercase tracking-widest text-gray-300 hover:border-white/30 hover:text-white transition-colors">
            Buscar
          </button>
        </form>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setTimeout(() => fetchUsers(1), 0) }}
          className="input-admin w-auto"
        >
          <option value="">Todos os perfis</option>
          <option value="ADMIN">Admin</option>
          <option value="SELLER">Vendedor</option>
        </select>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-sm bg-[var(--color-primary)] px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          <Plus className="h-4 w-4" /> Novo Usuário
        </button>
      </div>

      {/* Form */}
      {showForm && !createdPassword && (
        <div className="rounded-sm border border-white/5 bg-zinc-900 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading tracking-wider uppercase text-white">
              {editingId ? "Editar Usuário" : "Novo Usuário"}
            </h2>
            <button type="button" onClick={closeForm} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="label-admin">Nome *</label>
              <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="input-admin" />
            </div>
            <div>
              <label className="label-admin">Email *</label>
              <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="input-admin" />
            </div>
            <div>
              <label className="label-admin">Telefone</label>
              <input type="text" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="input-admin" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label-admin">Perfil *</label>
              <select value={form.role} onChange={(e) => updateField("role", e.target.value)} className="input-admin">
                <option value="SELLER">Vendedor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          {!editingId && (
            <p className="text-xs text-gray-500">
              Uma senha temporária será gerada automaticamente. O usuário será obrigado a trocá-la no primeiro login.
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-sm bg-[var(--color-primary)] px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar" : "Criar"}
            </button>
            <button type="button" onClick={closeForm} className="rounded-sm border border-white/10 px-4 py-3 text-sm font-bold uppercase tracking-widest text-gray-300 hover:border-white/30 hover:text-white transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-sm border border-white/5 bg-zinc-900 overflow-x-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
        {!loading && (
          <table className="w-full text-left text-sm">
            <thead className="bg-black text-xs uppercase tracking-[0.2em] text-gray-400">
              <tr>
                <th className="px-4 py-4">Nome</th>
                <th className="px-4 py-4">Email</th>
                <th className="px-4 py-4">Telefone</th>
                <th className="px-4 py-4">Perfil</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-4 font-medium text-white">{u.name}</td>
                  <td className="px-4 py-4 text-gray-300">{u.email}</td>
                  <td className="px-4 py-4 text-gray-300">{u.phone ?? "—"}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      u.role === "ADMIN"
                        ? "bg-purple-500/15 border border-purple-500/30 text-purple-300"
                        : "bg-blue-500/15 border border-blue-500/30 text-blue-300"
                    }`}>
                      {u.role === "ADMIN" ? "Admin" : "Vendedor"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {u.mustChangePassword ? (
                      <span className="rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-300">Senha pendente</span>
                    ) : (
                      <span className="rounded-full bg-green-500/15 border border-green-500/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-300">Ativo</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => openEdit(u)} className="rounded-sm border border-white/10 p-1.5 text-gray-400 hover:border-white/30 hover:text-white transition-colors" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleResetPassword(u.id)} className="rounded-sm border border-yellow-500/30 p-1.5 text-yellow-300 hover:bg-yellow-500/10 transition-colors" title="Resetar senha">
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDeactivate(u.id)} className="rounded-sm border border-red-500/30 p-1.5 text-red-300 hover:bg-red-500/10 transition-colors" title="Desativar">
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => fetchUsers(p)}
              className={`rounded-sm px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                p === meta.page
                  ? "bg-[var(--color-primary)] text-black"
                  : "border border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
