type IntegrationLevel = "ok" | "warning" | "blocked"

export type IntegrationSummary = {
  name: string
  level: IntegrationLevel
  mode: string
  message: string
}

export type InstagramFeedItem = {
  id: string
  media_url: string
  permalink: string
}

function isConfiguredValue(value: string | null | undefined) {
  if (!value) {
    return false
  }

  const normalizedValue = value.trim()

  return normalizedValue.length > 0 && !normalizedValue.includes("...")
}

function parseJsonArray(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeInstagramFeedItem(item: unknown, index: number): InstagramFeedItem | null {
  if (!item || typeof item !== "object") {
    return null
  }

  const candidate = item as Record<string, unknown>
  const mediaUrl = typeof candidate.media_url === "string" ? candidate.media_url.trim() : ""
  const permalink = typeof candidate.permalink === "string" ? candidate.permalink.trim() : ""

  if (!mediaUrl || !permalink) {
    return null
  }

  const id = typeof candidate.id === "string" && candidate.id.trim().length > 0
    ? candidate.id.trim()
    : `fallback-${index + 1}`

  return {
    id,
    media_url: mediaUrl,
    permalink,
  }
}

export function getStripeIntegrationSummary(): IntegrationSummary {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (
    isConfiguredValue(publishableKey) &&
    isConfiguredValue(secretKey) &&
    isConfiguredValue(webhookSecret)
  ) {
    return {
      name: "Stripe",
      level: "ok",
      mode: secretKey?.startsWith("sk_live_") ? "live" : "test",
      message: "Chaves públicas, secret e webhook configuradas.",
    }
  }

  return {
    name: "Stripe",
    level: "blocked",
    mode: "incomplete",
    message: "Faltam variáveis obrigatórias: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET.",
  }
}

export function getMelhorEnvioIntegrationSummary(): IntegrationSummary {
  const token = process.env.MELHOR_ENVIO_TOKEN
  const baseUrl = process.env.MELHOR_ENVIO_BASE_URL?.trim()

  if (isConfiguredValue(token)) {
    return {
      name: "Melhor Envio",
      level: "ok",
      mode: baseUrl || (process.env.NODE_ENV === "production" ? "production" : "sandbox"),
      message: "Token presente. A validação ponta a ponta ainda depende da URL pública de homologação/produção.",
    }
  }

  return {
    name: "Melhor Envio",
    level: "warning",
    mode: baseUrl || "sandbox",
    message: "Token ainda não configurado. Integração nacional fica parcialmente bloqueada até existir URL pública para homologação.",
  }
}

export function getCuratedInstagramFallbackPosts() {
  const rawPosts = parseJsonArray(process.env.INSTAGRAM_FALLBACK_POSTS)

  return rawPosts
    .map((item, index) => normalizeInstagramFeedItem(item, index))
    .filter((item): item is InstagramFeedItem => item !== null)
}

export function getInstagramIntegrationSummary(): IntegrationSummary {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  const fallbackPosts = getCuratedInstagramFallbackPosts()

  if (isConfiguredValue(accessToken)) {
    return {
      name: "Instagram",
      level: "ok",
      mode: "graph-api",
      message: "Feed configurado para buscar mídia real via token do Instagram.",
    }
  }

  if (fallbackPosts.length > 0) {
    return {
      name: "Instagram",
      level: "warning",
      mode: "curated-fallback",
      message: `Sem token real; usando fallback curado com ${fallbackPosts.length} item(ns).`,
    }
  }

  return {
    name: "Instagram",
    level: "warning",
    mode: "disabled",
    message: "Sem token real e sem fallback curado. A home exibirá apenas o link para o perfil.",
  }
}
