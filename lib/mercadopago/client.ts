import { MercadoPagoConfig, Payment, Preference } from "mercadopago"
import { getMercadoPagoAccessTokenFromEnv } from "@/lib/mercadopago/env"

const configs = new Map<string, MercadoPagoConfig>()

function resolveAccessToken(accessToken?: string | null) {
  return accessToken?.trim() || getMercadoPagoAccessTokenFromEnv()
}

function getMercadoPagoConfig(accessToken?: string | null): MercadoPagoConfig {
  const resolvedAccessToken = resolveAccessToken(accessToken)

  if (!resolvedAccessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado")
  }

  const cachedConfig = configs.get(resolvedAccessToken)
  if (cachedConfig) {
    return cachedConfig
  }

  const config = new MercadoPagoConfig({
    accessToken: resolvedAccessToken,
  })
  configs.set(resolvedAccessToken, config)

  return config
}

export function getMercadoPagoClient(accessToken?: string | null): {
  payment: Payment
  preference: Preference
} {
  const mpConfig = getMercadoPagoConfig(accessToken)
  return {
    payment: new Payment(mpConfig),
    preference: new Preference(mpConfig),
  }
}

export function isMercadoPagoConfigured(accessToken?: string | null): boolean {
  return Boolean(resolveAccessToken(accessToken))
}

export function isMercadoPagoActive(accessToken?: string | null): boolean {
  // TODO: implementar check no store settings
  return isMercadoPagoConfigured(accessToken)
}
