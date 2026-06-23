export function getMercadoPagoAccessTokenFromEnv() {
  return process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || process.env.ACCESS_TOKEN?.trim() || null
}

export function getMercadoPagoPublicKeyFromEnv() {
  return (
    process.env.MERCADO_PAGO_PUBLIC_KEY?.trim() ||
    process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.trim() ||
    process.env.PUBLIC_KEY?.trim() ||
    null
  )
}
