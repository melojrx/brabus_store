import { PrismaClient } from "@prisma/client"

type DecimalLike = { toNumber(): number }

export type ShippingCartItemInput = {
  productId: string
  quantity: number
}

export type MelhorEnvioService = {
  id: string
  name: string
  carrier: string
  price: number
  deliveryTime: string
}

export type LocalDeliveryZoneMatch = {
  id: string
  city: string
  state: string
  price: number
  deadlineText: string
}

function decimalToNumber(value: DecimalLike | number | null | undefined) {
  if (value == null) {
    return 0
  }

  return typeof value === "number" ? value : value.toNumber()
}

export function normalizePostalCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8)
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function buildDeadlineText(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value} dias úteis`
  }

  return "Prazo indisponível"
}

function resolveMelhorEnvioBaseUrl() {
  if (process.env.MELHOR_ENVIO_BASE_URL) {
    return process.env.MELHOR_ENVIO_BASE_URL
  }

  return process.env.NODE_ENV === "production"
    ? "https://melhorenvio.com.br/api/v2"
    : "https://sandbox.melhorenvio.com.br/api/v2"
}

export async function calculateOrderWeight(prisma: PrismaClient, items: ShippingCartItemInput[]) {
  const uniqueProductIds = Array.from(new Set(items.map((item) => item.productId)))

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: uniqueProductIds,
      },
    },
    select: {
      id: true,
      weightKg: true,
    },
  })

  const productWeightMap = new Map(products.map((product) => [product.id, product.weightKg ?? 0.5]))

  return items.reduce((sum, item) => {
    const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0
    return sum + (productWeightMap.get(item.productId) ?? 0.5) * quantity
  }, 0)
}

export async function fetchMelhorEnvioServices({
  toPostalCode,
  weightKg,
  height = 10,
  width = 20,
  length = 20,
}: {
  toPostalCode: string
  weightKg: number
  height?: number
  width?: number
  length?: number
}) {
  const normalizedPostalCode = normalizePostalCode(toPostalCode)
  const normalizedWeight = Number(weightKg)
  const token = process.env.MELHOR_ENVIO_TOKEN

  if (!normalizedPostalCode || normalizedPostalCode.length !== 8 || !Number.isFinite(normalizedWeight) || normalizedWeight <= 0) {
    return []
  }

  if (!token) {
    return []
  }

  const response = await fetch(`${resolveMelhorEnvioBaseUrl()}/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "BrabusStore (jrmelo@example.com)",
    },
    body: JSON.stringify({
      from: { postal_code: "62765000" },
      to: { postal_code: normalizedPostalCode },
      products: [
        {
          id: "order",
          quantity: 1,
          weight: normalizedWeight,
          height,
          width,
          length,
          insurance_value: 0,
        },
      ],
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Erro ao consultar Melhor Envio.")
  }

  const services = (await response.json()) as Array<Record<string, unknown>>

  return services
    .filter((service) => !service.error)
    .map((service, index) => {
      const serviceId = String(service.id ?? service.name ?? index)
      const companyName =
        typeof service.company === "object" &&
        service.company &&
        "name" in service.company &&
        typeof service.company.name === "string"
          ? service.company.name.trim()
          : ""
      const serviceName = typeof service.name === "string" && service.name.trim().length > 0
        ? service.name.trim()
        : companyName || "Transportadora"
      const rawPrice =
        typeof service.custom_price === "string" && service.custom_price.trim().length > 0
          ? Number(service.custom_price)
          : Number(service.price)

      return {
        id: serviceId,
        name: serviceName,
        carrier: companyName || serviceName,
        price: Number.isFinite(rawPrice) ? rawPrice : 0,
        deliveryTime: buildDeadlineText(service.custom_delivery_time ?? service.delivery_time),
      } satisfies MelhorEnvioService
    })
    .filter((service) => service.price >= 0)
}

export async function findLocalDeliveryZone(
  prisma: PrismaClient,
  city: string,
  state: string | null = "CE",
) {
  const zones = await prisma.localDeliveryZone.findMany({
    where: { active: true },
    select: {
      id: true,
      city: true,
      state: true,
      price: true,
      deadlineText: true,
    },
    orderBy: { city: "asc" },
  })

  const normalizedCity = normalizeText(city)
  const normalizedState = normalizeText(state ?? "CE")

  const match = zones.find(
    (zone) =>
      normalizeText(zone.city) === normalizedCity &&
      normalizeText(zone.state) === normalizedState,
  )

  if (!match) {
    return null
  }

  return {
    id: match.id,
    city: match.city,
    state: match.state,
    price: decimalToNumber(match.price),
    deadlineText: match.deadlineText,
  } satisfies LocalDeliveryZoneMatch
}
