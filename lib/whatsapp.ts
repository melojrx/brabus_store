export function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "")

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }

  return digits
}

export function buildWhatsAppUrl(whatsapp: string, message: string) {
  const number = normalizeWhatsAppNumber(whatsapp)
  const params = new URLSearchParams({ text: message })
  return `https://wa.me/${number}?${params.toString()}`
}
