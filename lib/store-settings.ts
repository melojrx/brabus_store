import prisma from "@/lib/prisma"

export const DEFAULT_STORE_INSTAGRAM_HANDLE = "@brabus_performancestore"
export const DEFAULT_STORE_INSTAGRAM_URL = "https://instagram.com/brabus_performancestore"
export const DEFAULT_STORE_ADDRESS_CITY = "Aracoiaba"
export const DEFAULT_STORE_ADDRESS_STATE = "CE"
export const DEFAULT_STORE_WHATSAPP = "5585921002688"

export function formatStoreWhatsApp(value: string | null | undefined) {
  const digits = (value ?? DEFAULT_STORE_WHATSAPP).replace(/\D/g, "")
  const localNumber = digits.startsWith("55") ? digits.slice(2) : digits

  return localNumber.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3")
}

export function normalizeInstagramHandle(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? ""

  if (!normalizedValue) {
    return DEFAULT_STORE_INSTAGRAM_HANDLE
  }

  if (normalizedValue.startsWith("http://") || normalizedValue.startsWith("https://")) {
    try {
      const url = new URL(normalizedValue)
      const pathSegment = url.pathname.split("/").filter(Boolean)[0]

      if (pathSegment) {
        return `@${pathSegment.replace(/^@/, "")}`
      }
    } catch {
      return DEFAULT_STORE_INSTAGRAM_HANDLE
    }
  }

  const sanitizedHandle = normalizedValue.replace(/^@+/, "")

  return sanitizedHandle ? `@${sanitizedHandle}` : DEFAULT_STORE_INSTAGRAM_HANDLE
}

export function buildInstagramProfileUrl(handle: string | null | undefined) {
  const normalizedHandle = normalizeInstagramHandle(handle)
  return `https://instagram.com/${normalizedHandle.replace(/^@/, "")}`
}

export async function getPublicStoreSettings() {
  const settings = await prisma.storeSettings.findFirst({
    select: {
      whatsapp: true,
      instagram: true,
      pixKey: true,
      openingHours: true,
      addressStreet: true,
      addressComplement: true,
      addressCity: true,
      addressState: true,
      addressZip: true,
      googleMapsUrl: true,
      googleMapsEmbed: true,
    },
  })

  return {
    whatsapp: settings?.whatsapp ?? DEFAULT_STORE_WHATSAPP,
    instagram: normalizeInstagramHandle(settings?.instagram),
    instagramUrl: buildInstagramProfileUrl(settings?.instagram),
    pixKey: settings?.pixKey ?? null,
    openingHours: settings?.openingHours ?? "Seg–Sex: 8h–18h | Sáb: 8h–13h",
    addressStreet: settings?.addressStreet ?? "Rua Antônio Lopes, 571",
    addressComplement: settings?.addressComplement ?? "Conjunto Cohab",
    addressCity: settings?.addressCity ?? DEFAULT_STORE_ADDRESS_CITY,
    addressState: settings?.addressState ?? DEFAULT_STORE_ADDRESS_STATE,
    addressZip: settings?.addressZip ?? "62765-000",
    googleMapsUrl: settings?.googleMapsUrl ?? null,
    googleMapsEmbed: settings?.googleMapsEmbed ?? null,
  }
}
