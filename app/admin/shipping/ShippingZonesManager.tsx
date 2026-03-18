"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Trash2, Pencil, Loader2 } from "lucide-react"

type Zone = {
  id: string
  city: string
  state: string
  price: number
  deadlineText: string
  active: boolean
}

const EMPTY = { city: "", state: "CE", price: "", deadlineText: "Mesmo dia ou próximo dia útil", active: true }

export default function ShippingZonesManager({ initialZones }: { initialZones: Zone[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Zone | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  function openCreate() { setEditing(null); setForm(EMPTY); setError(""); setDrawerOpen(true) }
  function openEdit(z: Zone) {
    setEditing(z)
    setForm({ city: z.city, state: z.state, price: String(z.price), deadlineText: z.deadlineText, active: z.active })
    setError(""); setDrawerOpen(true)
  }
  function close() { setDrawerOpen(false); setEditing(null); setError("") }
  function setField(key: keyof typeof EMPTY, value: string | boolean) { setForm((p) => ({ ...p, [key]: value })) }

  async function handleSave() {
    setError("")
    if (!form.city || !form.price) { setError("Cidade e frete são obrigatórios."); return }
    setSaving(true)
    try {
      const url = editing ? `/api/admin/shipping/zones/${editing.id}` : "/api/admin/shipping/zones"
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) { setError((await res.json()).error ?? "Erro."); return }
      close(); startTransition(() => router.refresh())
    } catch { setError("Erro de conexão.") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta zona?")) return
    setDeletingId(id)
    try {
      await fetch(`/api/admin/shipping/zones/${id}`, { method: "DELETE" })
      startTransition(() => router.refresh())
    } finally { setDeletingId(null) }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-heading tracking-wider uppercase">Zonas de Entrega</h1>
        <button onClick={openCreate} className="bg-[var(--color-primary)] text-black font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-sm flex items-center gap-2 hover:bg-[var(--color-primary-dark)] transition-colors">
          <Plus className="w-4 h-4" /> Nova Zona
        </button>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-black text-gray-400 tracking-widest">
            <tr>
              <th className="px-6 py-4">Cidade</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Frete</th>
              <th className="px-6 py-4">Prazo</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {initialZones.map((z) => (
              <tr key={z.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{z.city}</td>
                <td className="px-6 py-4 text-gray-400">{z.state}</td>
                <td className="px-6 py-4 text-[var(--color-primary)] font-heading tracking-wider">R$ {z.price.toFixed(2).replace(".", ",")}</td>
                <td className="px-6 py-4 text-gray-400 text-xs">{z.deadlineText}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-sm text-xs font-bold ${z.active ? "bg-green-500/20 text-green-500" : "bg-gray-500/20 text-gray-400"}`}>
                    {z.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(z)} className="text-[var(--color-primary)] border border-[var(--color-primary)]/50 rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--color-primary)]/10 transition-colors flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                    <button onClick={() => handleDelete(z.id)} disabled={deletingId === z.id} className="text-red-400 border border-red-500/30 rounded-sm p-1.5 hover:bg-red-500/10 transition-colors disabled:opacity-30">
                      {deletingId === z.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {initialZones.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhuma zona cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={close} />
          <div className="w-full max-w-md bg-zinc-950 border-l border-white/10 flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-heading tracking-wider uppercase">{editing ? "Editar Zona" : "Nova Zona"}</h2>
              <button onClick={close} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-sm px-4 py-3">{error}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-admin">Cidade *</label>
                  <input className="input-admin" value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Aracoiaba" />
                </div>
                <div>
                  <label className="label-admin">Estado (UF)</label>
                  <input className="input-admin" value={form.state} onChange={(e) => setField("state", e.target.value)} maxLength={2} placeholder="CE" />
                </div>
                <div>
                  <label className="label-admin">Frete (R$) *</label>
                  <input className="input-admin" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setField("price", e.target.value)} placeholder="10.00" />
                </div>
              </div>
              <div>
                <label className="label-admin">Prazo de Entrega</label>
                <input className="input-admin" value={form.deadlineText} onChange={(e) => setField("deadlineText", e.target.value)} placeholder="Mesmo dia ou próximo dia útil" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input type="checkbox" checked={form.active} onChange={(e) => setField("active", e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
                <span className="text-sm text-gray-300">Ativa</span>
              </label>
            </div>
            <div className="px-6 py-5 border-t border-white/10 flex gap-3 shrink-0">
              <button onClick={close} className="flex-1 border border-white/20 text-white font-bold uppercase tracking-widest text-xs py-3 rounded-sm hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving || isPending} className="flex-1 bg-[var(--color-primary)] text-black font-bold uppercase tracking-widest text-xs py-3 rounded-sm hover:bg-[var(--color-primary-dark)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {(saving || isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
