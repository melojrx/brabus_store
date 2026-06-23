"use client"

import { useEffect, useState } from "react"
import { Save, Loader2, ExternalLink, CreditCard, Bell } from "lucide-react"
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
  mercadoPagoAccessToken: string | null
  mercadoPagoEnvironment: string
  expiryWarningDays: number
  expiryCriticalDays: number
  expiryAlertsEnabled: boolean
  telegramBotToken: string | null
  telegramChatId: string | null
}

export default function SettingsForm({
  settings,
  webhookUrl,
}: {
  settings: Settings
  webhookUrl: string
}) {
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
    mercadoPagoAccessToken: settings.mercadoPagoAccessToken ?? "",
    mercadoPagoEnvironment: settings.mercadoPagoEnvironment,
    expiryWarningDays: String(settings.expiryWarningDays),
    expiryCriticalDays: String(settings.expiryCriticalDays),
    expiryAlertsEnabled: settings.expiryAlertsEnabled,
    telegramBotToken: settings.telegramBotToken ?? "",
    telegramChatId: settings.telegramChatId ?? "",
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

  function set(key: keyof typeof form, value: string | boolean) {
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
        body: JSON.stringify({
          ...form,
          expiryWarningDays: Number.parseInt(form.expiryWarningDays, 10) || 30,
          expiryCriticalDays: Number.parseInt(form.expiryCriticalDays, 10) || 7,
        }),
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

      {/* Mercado Pago Section */}
      <div className="pt-6 border-t border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-xl font-heading tracking-wider uppercase">Mercado Pago</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-admin">Access Token</label>
            <input
              type="password"
              className="input-admin"
              value={form.mercadoPagoAccessToken}
              onChange={(e) => set("mercadoPagoAccessToken", e.target.value)}
              placeholder="APP-USR-xxxxxxxx-xxxxxxxx-..."
              autoComplete="off"
            />
          </div>

          <div>
            <label className="label-admin">Ambiente</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mercadoPagoEnvironment"
                  value="sandbox"
                  checked={form.mercadoPagoEnvironment === "sandbox"}
                  onChange={(e) => set("mercadoPagoEnvironment", e.target.value)}
                  className="w-4 h-4 accent-[var(--color-primary)]"
                />
                <span className="text-zinc-300">Sandbox (Testes)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mercadoPagoEnvironment"
                  value="production"
                  checked={form.mercadoPagoEnvironment === "production"}
                  onChange={(e) => set("mercadoPagoEnvironment", e.target.value)}
                  className="w-4 h-4 accent-[var(--color-primary)]"
                />
                <span className="text-zinc-300">Produção</span>
              </label>
            </div>
          </div>

          <div>
            <label className="label-admin">Webhook URL</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                className="input-admin flex-1"
                value={webhookUrl}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <a
                href={webhookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-sm transition-colors"
                title="Abrir webhook URL"
              >
                <ExternalLink className="w-5 h-5 text-zinc-400" />
              </a>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Configure esta URL no painel do Mercado Pago em: Configurações &rarr; Webhooks
            </p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-xl font-heading tracking-wider uppercase">Alertas de Validade</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label-admin">Alerta amarelo (dias)</label>
            <input
              className="input-admin"
              type="number"
              min={1}
              value={form.expiryWarningDays}
              onChange={(e) => set("expiryWarningDays", e.target.value)}
            />
          </div>
          <div>
            <label className="label-admin">Alerta crítico (dias)</label>
            <input
              className="input-admin"
              type="number"
              min={1}
              value={form.expiryCriticalDays}
              onChange={(e) => set("expiryCriticalDays", e.target.value)}
            />
          </div>
          <div>
            <label className="label-admin">Telegram Bot Token</label>
            <input
              type="password"
              className="input-admin"
              value={form.telegramBotToken}
              onChange={(e) => set("telegramBotToken", e.target.value)}
              placeholder="123456789:ABC..."
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label-admin">Telegram Chat ID</label>
            <input
              className="input-admin"
              value={form.telegramChatId}
              onChange={(e) => set("telegramChatId", e.target.value)}
              placeholder="-1001234567890"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={form.expiryAlertsEnabled}
            onChange={(e) => set("expiryAlertsEnabled", e.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          Enviar alertas automáticos (Telegram e webhooks)
        </label>

        <p className="text-xs text-zinc-500 mt-2">
          Agende um cron diário em <code className="text-zinc-400">POST /api/cron/expiry-alerts</code> com header
          {" "}<code className="text-zinc-400">Authorization: Bearer CRON_SECRET</code>.
        </p>
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
