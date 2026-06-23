import { Settings } from "lucide-react"
import SettingsForm from "./SettingsForm"
import prisma from "@/lib/prisma"
import { normalizeInstagramHandle } from "@/lib/store-settings"

export default async function AdminSettings() {
  const s = await prisma.storeSettings.findFirst()

  const settings = {
    id: s?.id ?? "",
    whatsapp: s?.whatsapp ?? "",
    instagram: normalizeInstagramHandle(s?.instagram ?? ""),
    pixKey: s?.pixKey ?? null,
    openingHours: s?.openingHours ?? "",
    addressStreet: s?.addressStreet ?? "",
    addressComplement: s?.addressComplement ?? "",
    addressCity: s?.addressCity ?? "",
    addressState: s?.addressState ?? "",
    addressZip: s?.addressZip ?? "",
    googleMapsUrl: s?.googleMapsUrl ?? null,
    googleMapsEmbed: s?.googleMapsEmbed ?? null,
    mercadoPagoAccessToken: s?.mercadoPagoAccessToken ?? null,
    mercadoPagoEnvironment: s?.mercadoPagoEnvironment ?? "sandbox",
    expiryWarningDays: s?.expiryWarningDays ?? 30,
    expiryCriticalDays: s?.expiryCriticalDays ?? 7,
    expiryAlertsEnabled: s?.expiryAlertsEnabled ?? true,
    telegramBotToken: s?.telegramBotToken ?? null,
    telegramChatId: s?.telegramChatId ?? null,
  }

  const webhookUrl = `${(process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/mercadopago/webhook`

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-heading tracking-wider uppercase">Configurações Gerais</h1>
      </div>
      <SettingsForm settings={settings} webhookUrl={webhookUrl} />
    </div>
  )
}
