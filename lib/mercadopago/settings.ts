import prisma from "@/lib/prisma"
import { getMercadoPagoAccessTokenFromEnv } from "@/lib/mercadopago/env"

export type MercadoPagoSettings = {
  accessToken: string | null
  environment: "sandbox" | "production"
}

function normalizeEnvironment(value: string | null | undefined): MercadoPagoSettings["environment"] {
  return value === "production" ? "production" : "sandbox"
}

export async function getMercadoPagoSettings(): Promise<MercadoPagoSettings> {
  const settings = await prisma.storeSettings.findFirst({
    select: {
      mercadoPagoAccessToken: true,
      mercadoPagoEnvironment: true,
    },
  })

  return {
    accessToken:
      settings?.mercadoPagoAccessToken?.trim() ||
      getMercadoPagoAccessTokenFromEnv() ||
      null,
    environment: normalizeEnvironment(settings?.mercadoPagoEnvironment ?? process.env.MERCADO_PAGO_ENVIRONMENT),
  }
}
