"use client"

import { useEffect, useState } from "react"
import { Save, Loader2 } from "lucide-react"
import AdminInlineFeedback, { type AdminInlineFeedbackState } from "@/components/admin/AdminInlineFeedback"

type Settings = {
  id: string
  whatsapp: string
  instagram: string
  pixKey: string | null
  openingHours: string
  addressStreet: string
  addressComplement: string
  addressCity: string
  addressState: string
  addressZip: string
  googleMapsUrl: string | null
  googleMapsEmbed: string | null
}

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [form, setForm] = useState({
    whatsapp: settings.whatsapp,
    instagram: settings.instagram,
    pixKey: settings.pixKey ?? "",
    openingHours: settings.openingHours,
    addressStreet: settings.addressStreet,
    addressComplement: settings.addressComplement,
    addressCity: settings.addressCity,
    addressState: settings.addressState,
    addressZip: settings.addressZip,
    googleMapsUrl: settings.googleMapsUrl ?? "",
    googleMapsEmbed: settings.googleMapsEmbed ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<AdminInlineFeedbackState>(null)

  useEffect(() => {
    if (feedback?.type !== "success") {
      return
    }

    const timeoutId = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (feedback?.type === "success") {
      setFeedback(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        setFeedback({ type: "error", message: "Erro ao salvar configurações." })
        return
      }
      setFeedback({ type: "success", message: "Configurações salvas com sucesso." })
    } catch {
      setFeedback({ type: "error", message: "Erro de conexão." })
    }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-sm p-8 space-y-6">
      <AdminInlineFeedback feedback={feedback} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label-admin">WhatsApp</label>
          <input className="input-admin" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="5585999999999" />
        </div>
        <div>
          <label className="label-admin">Instagram</label>
          <input className="input-admin" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@brabus_pstore" />
        </div>
        <div>
          <label className="label-admin">Chave Pix</label>
          <input className="input-admin" value={form.pixKey} onChange={(e) => set("pixKey", e.target.value)} placeholder="email, telefone, CPF ou chave aleatória" />
        </div>
        <div>
          <label className="label-admin">Horário de Funcionamento</label>
          <input className="input-admin" value={form.openingHours} onChange={(e) => set("openingHours", e.target.value)} placeholder="Seg–Sex: 8h–18h" />
        </div>
        <div>
          <label className="label-admin">CEP</label>
          <input className="input-admin" value={form.addressZip} onChange={(e) => set("addressZip", e.target.value)} placeholder="00000-000" />
        </div>
        <div>
          <label className="label-admin">Rua</label>
          <input className="input-admin" value={form.addressStreet} onChange={(e) => set("addressStreet", e.target.value)} />
        </div>
        <div>
          <label className="label-admin">Complemento</label>
          <input className="input-admin" value={form.addressComplement} onChange={(e) => set("addressComplement", e.target.value)} />
        </div>
        <div>
          <label className="label-admin">Cidade</label>
          <input className="input-admin" value={form.addressCity} onChange={(e) => set("addressCity", e.target.value)} />
        </div>
        <div>
          <label className="label-admin">Estado (UF)</label>
          <input className="input-admin" value={form.addressState} onChange={(e) => set("addressState", e.target.value)} maxLength={2} />
        </div>
      </div>

      <div>
        <label className="label-admin">URL Google Maps</label>
        <input className="input-admin" value={form.googleMapsUrl} onChange={(e) => set("googleMapsUrl", e.target.value)} placeholder="https://maps.google.com/..." />
      </div>
      <div>
        <label className="label-admin">Embed Google Maps (iframe src)</label>
        <input className="input-admin" value={form.googleMapsEmbed} onChange={(e) => set("googleMapsEmbed", e.target.value)} placeholder="https://www.google.com/maps/embed?..." />
      </div>

      <div className="pt-6 border-t border-white/10 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold uppercase tracking-widest px-8 py-4 rounded-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 min-w-[200px]"
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="w-5 h-5" /> Salvar Configurações</>
          )}
        </button>
      </div>
    </div>
  )
}
