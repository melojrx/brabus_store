export type StoreLocationSettings = {
  addressStreet: string
  addressComplement: string
  addressCity: string
  addressState: string
  addressZip: string
  googleMapsUrl: string | null
  googleMapsEmbed: string | null
}

export type StoreContactSettings = StoreLocationSettings & {
  whatsapp: string
  instagram: string
  instagramUrl: string
  openingHours: string
}

function getGoogleMapsUrl(value: string | null, embed: boolean) {
  if (!value) return null
  try {
    const url = new URL(value)
    const mapHost = ["www.google.com", "maps.google.com", "www.google.com.br", "maps.google.com.br"].includes(url.hostname)
    const shortLink = url.hostname === "maps.app.goo.gl" || (url.hostname === "goo.gl" && url.pathname.startsWith("/maps"))
    if (url.protocol !== "https:" || url.username || url.password) return null
    if (embed) return mapHost && url.pathname.startsWith("/maps") ? url.href : null
    return (mapHost && url.pathname.startsWith("/maps")) || shortLink ? url.href : null
  } catch {
    return null
  }
}

export function getStoreMapLinks(settings: StoreLocationSettings) {
  const address = [settings.addressStreet, settings.addressComplement, `${settings.addressCity} - ${settings.addressState}`, settings.addressZip].filter(Boolean).join(", ")
  const query = encodeURIComponent(address)
  return {
    open: getGoogleMapsUrl(settings.googleMapsUrl, false) ?? `https://www.google.com/maps/search/?api=1&query=${query}`,
    embed: getGoogleMapsUrl(settings.googleMapsEmbed, true) ?? `https://maps.google.com/maps?q=${query}&z=17&output=embed&hl=pt-BR`,
  }
}
