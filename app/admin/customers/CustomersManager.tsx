"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Search, UserMinus, Pencil, X } from "lucide-react"
import AdminInlineFeedback, { type AdminInlineFeedbackState } from "@/components/admin/AdminInlineFeedback"
import type { SerializedCustomer } from "@/lib/customers"

type Meta = { page: number; pageSize: number; totalItems: number; totalPages: number }

type FormData = {
  name: string
  email: string
  phone: string
  personType: string
  cpf: string
  cnpj: string
  stateRegistration: string
  addressStreet: string
  addressNumber: string
  addressComplement: string
  addressNeighborhood: string
  addressCity: string
  addressState: string
  addressZip: string
  notes: string
}

const emptyForm: FormData = {
  name: "", email: "", phone: "", personType: "", cpf: "", cnpj: "",
  stateRegistration: "", addressStreet: "", addressNumber: "", addressComplement: "",
  addressNeighborhood: "", addressCity: "", addressState: "", addressZip: "", notes: "",
}

function formatDoc(cpf: string | null, cnpj: string | null) {
  if (cpf) {
    const d = cpf.replace(/\D/g, "")
    if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
    return cpf
  }
  if (cnpj) {
    const d = cnpj.replace(/\D/g, "")
    if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
    return cnpj
  }
  return "—"
}

export default function CustomersManager({
  initialData,
  initialMeta,
}: {
  initialData: SerializedCustomer[]
  initialMeta: Meta
}) {
  const [customers, setCustomers] = useState(initialData)
  const [meta, setMeta] = useState(initialMeta)
  const [search, setSearch] = useState("")
  const [personTypeFilter, setPersonTypeFilter] = useState("")
  const [feedback, setFeedback] = useState<AdminInlineFeedbackState>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (feedback?.type !== "success") return
    const t = window.setTimeout(() => setFeedback(null), 5000)
    return () => window.clearTimeout(t)
  }, [feedback])

  async function fetchCustomers(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", "20")
      if (search) params.set("search", search)
      if (personTypeFilter) params.set("personType", personTypeFilter)

      const res = await fetch(`/api/admin/customers?${params}`)
      const json = await res.json()
      setCustomers(json.data)
      setMeta(json.meta)
    } catch {
      setFeedback({ type: "error", message: "Erro ao buscar clientes." })
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchCustomers(1)
  }

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(customer: SerializedCustomer) {
    setForm({
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      personType: customer.personType ?? "",
      cpf: customer.cpf ?? "",
      cnpj: customer.cnpj ?? "",
      stateRegistration: customer.stateRegistration ?? "",
      addressStreet: customer.addressStreet ?? "",
      addressNumber: customer.addressNumber ?? "",
      addressComplement: customer.addressComplement ?? "",
      addressNeighborhood: customer.addressNeighborhood ?? "",
      addressCity: customer.addressCity ?? "",
      addressState: customer.addressState ?? "",
      addressZip: customer.addressZip ?? "",
      notes: customer.notes ?? "",
    })
    setEditingId(customer.id)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setFeedback({ type: "error", message: "Nome é obrigatório." })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const url = editingId ? `/api/admin/customers/${editingId}` : "/api/admin/customers"
      const method = editingId ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          personType: form.personType || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setFeedback({ type: "error", message: json.error || "Erro ao salvar." })
        return
      }

      setFeedback({ type: "success", message: editingId ? "Cliente atualizado." : "Cliente criado." })
      closeForm()
      fetchCustomers(meta.page)
    } catch {
      setFeedback({ type: "error", message: "Erro de conexão." })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(id: string) {
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json()
        setFeedback({ type: "error", message: json.error || "Erro ao desativar." })
        return
      }
      setFeedback({ type: "success", message: "Cliente desativado." })
      fetchCustomers(meta.page)
    } catch {
      setFeedback({ type: "error", message: "Erro de conexão." })
    }
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <AdminInlineFeedback feedback={feedback} />

      {/* Search and filters */}
      <div className="flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email, telefone, CPF..."
              className="input-admin pl-10 w-full"
            />
          </div>
          <button type="submit" className="rounded-sm bg-white/5 border border-white/10 px-4 py-3 text-sm font-bold uppercase tracking-widest text-gray-300 hover:border-white/30 hover:text-white transition-colors">
            Buscar
          </button>
        </form>

        <select
          value={personTypeFilter}
          onChange={(e) => { setPersonTypeFilter(e.target.value); setTimeout(() => fetchCustomers(1), 0) }}
          className="input-admin w-auto"
        >
          <option value="">Todos os tipos</option>
          <option value="PF">Pessoa Física</option>
          <option value="PJ">Pessoa Jurídica</option>
        </select>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-sm bg-[var(--color-primary)] px-4 py-3 text-sm font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          <Plus className="h-4 w-4" /> Novo Cliente
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-sm border border-white/5 bg-zinc-900 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading tracking-wider uppercase text-white">
              {editingId ? "Editar Cliente" : "Novo Cliente"}
            </h2>
            <button type="button" onClick={closeForm} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label-admin">Nome *</label>
              <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="input-admin" />
            </div>
            <div>
              <label className="label-admin">Email</label>
              <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="input-admin" />
            </div>
            <div>
              <label className="label-admin">Telefone</label>
              <input type="text" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="input-admin" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label-admin">Tipo Pessoa</label>
              <select value={form.personType} onChange={(e) => updateField("personType", e.target.value)} className="input-admin">
                <option value="">—</option>
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
            </div>
            <div>
              <label className="label-admin">CPF</label>
              <input type="text" value={form.cpf} onChange={(e) => updateField("cpf", e.target.value)} placeholder="000.000.000-00" className="input-admin" />
            </div>
            <div>
              <label className="label-admin">CNPJ</label>
              <input type="text" value={form.cnpj} onChange={(e) => updateField("cnpj", e.target.value)} placeholder="00.000.000/0000-00" className="input-admin" />
            </div>
            <div>
              <label className="label-admin">Inscrição Estadual</label>
              <input type="text" value={form.stateRegistration} onChange={(e) => updateField("stateRegistration", e.target.value)} className="input-admin" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="label-admin">Rua</label>
              <input type="text" value={form.addressStreet} onChange={(e) => updateField("addressStreet", e.target.value)} className="input-admin" />
            </div>
            <div>
              <label className="label-admin">Número</label>
              <input type="text" value={form.addressNumber} onChange={(e) => updateField("addressNumber", e.target.value)} className="input-admin" />
            </div>
            <div>
              <label className="label-admin">Complemento</label>
              <input type="text" value={form.addressComplement} onChange={(e) => updateField("addressComplement", e.target.value)} className="input-admin" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label-admin">Bairro</label>
              <input type="text" value={form.addressNeighborhood} onChange={(e) => updateField("addressNeighborhood", e.target.value)} className="input-admin" />
            </div>
            <div>
              <label className="label-admin">Cidade</label>
              <input type="text" value={form.addressCity} onChange={(e) => updateField("addressCity", e.target.value)} className="input-admin" />
            </div>
            <div>
              <label className="label-admin">Estado</label>
              <input type="text" value={form.addressState} onChange={(e) => updateField("addressState", e.target.value)} className="input-admin" maxLength={2} />
            </div>
            <div>
              <label className="label-admin">CEP</label>
              <input type="text" value={form.addressZip} onChange={(e) => updateField("addressZip", e.target.value)} className="input-admin" />
            </div>
          </div>

          <div>
            <label className="label-admin">Observações</label>
            <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} className="input-admin" rows={2} />
          </div>

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
                <th className="px-4 py-4">Documento</th>
                <th className="px-4 py-4">Tipo</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-4 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-4 text-gray-300">{c.email ?? "—"}</td>
                  <td className="px-4 py-4 text-gray-300">{c.phone ?? "—"}</td>
                  <td className="px-4 py-4 text-gray-300 font-mono text-xs">{formatDoc(c.cpf, c.cnpj)}</td>
                  <td className="px-4 py-4">
                    {c.personType ? (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {c.personType}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-4">
                    {c.active ? (
                      <span className="rounded-full bg-green-500/15 border border-green-500/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-300">Ativo</span>
                    ) : (
                      <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">Inativo</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="rounded-sm border border-white/10 p-1.5 text-gray-400 hover:border-white/30 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {c.active && (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(c.id)}
                          className="rounded-sm border border-red-500/30 p-1.5 text-red-300 hover:bg-red-500/10 transition-colors"
                          title="Desativar"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Nenhum cliente encontrado.
                  </td>
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
              onClick={() => fetchCustomers(p)}
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
