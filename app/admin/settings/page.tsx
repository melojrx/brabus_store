import { Settings } from "lucide-react"
import SettingsForm from "./SettingsForm"
import prisma from "@/lib/prisma"

export default async function AdminSettings() {
  const s = await prisma.storeSettings.findFirst()

  const settings = {
    id: s?.id ?? "",
    whatsapp: s?.whatsapp ?? "",
    instagram: s?.instagram ?? "",
    openingHours: s?.openingHours ?? "",
    addressStreet: s?.addressStreet ?? "",
    addressComplement: s?.addressComplement ?? "",
    addressCity: s?.addressCity ?? "",
    addressState: s?.addressState ?? "",
    addressZip: s?.addressZip ?? "",
    googleMapsUrl: s?.googleMapsUrl ?? null,
    googleMapsEmbed: s?.googleMapsEmbed ?? null,
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-heading tracking-wider uppercase">Configurações Gerais</h1>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}
