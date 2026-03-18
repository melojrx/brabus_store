import prisma from "@/lib/prisma"

export const DEFAULT_STORE_INSTAGRAM_HANDLE = "@brabus_pstore"
export const DEFAULT_STORE_INSTAGRAM_URL = "https://instagram.com/brabus_pstore"

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
    whatsapp: settings?.whatsapp ?? "5585997839040",
    instagram: normalizeInstagramHandle(settings?.instagram),
    instagramUrl: buildInstagramProfileUrl(settings?.instagram),
    pixKey: settings?.pixKey ?? null,
    openingHours: settings?.openingHours ?? "Seg–Sex: 8h–18h | Sáb: 8h–13h",
    addressStreet: settings?.addressStreet ?? "Rua Antônio Lopes, 571",
    addressComplement: settings?.addressComplement ?? "Conjunto Cohab",
    addressCity: settings?.addressCity ?? "Aracoiaba",
    addressState: settings?.addressState ?? "CE",
    addressZip: settings?.addressZip ?? "62765-000",
    googleMapsUrl: settings?.googleMapsUrl ?? null,
    googleMapsEmbed: settings?.googleMapsEmbed ?? null,
  }
}
