import MercadoPago, { MercadoPagoConfig, Payment, Preference } from "mercadopago"

let config: MercadoPagoConfig | null = null

function getMercadoPagoConfig(): MercadoPagoConfig {
  if (config) {
    return config
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado")
  }

  config = new MercadoPagoConfig({
    accessToken,
  })

  return config
}

export function getMercadoPagoClient(): {
  payment: Payment
  preference: Preference
} {
  const mpConfig = getMercadoPagoConfig()
  return {
    payment: new Payment(mpConfig),
    preference: new Preference(mpConfig),
  }
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN)
}

export function isMercadoPagoActive(): boolean {
  // TODO: implementar check no store settings
  return isMercadoPagoConfigured()
}
