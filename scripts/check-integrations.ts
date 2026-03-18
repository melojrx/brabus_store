import Stripe from "stripe"
import {
  getCuratedInstagramFallbackPosts,
  getInstagramIntegrationSummary,
  getMelhorEnvioIntegrationSummary,
  getStripeIntegrationSummary,
} from "../lib/integration-status"

function printSection(title: string) {
  console.log(`\n[${title}]`)
}

function printSummary(summary: {
  level: string
  mode: string
  message: string
}) {
  console.log(`- status: ${summary.level}`)
  console.log(`- mode: ${summary.mode}`)
  console.log(`- message: ${summary.message}`)
}

async function validateStripe() {
  const summary = getStripeIntegrationSummary()
  printSection("Stripe")
  printSummary(summary)

  if (summary.level !== "ok") {
    return { ok: false, blocking: true }
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const account = await stripe.accounts.retrieve()
    const paymentMethods = process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES || "card"

    console.log("- remote-check: ok")
    console.log(`- account-id: ${account.id}`)
    console.log(`- checkout-methods: ${paymentMethods}`)
    return { ok: true, blocking: false }
  } catch (error) {
    console.log("- remote-check: failed")
    console.log(`- error: ${error instanceof Error ? error.message : "Erro desconhecido ao validar Stripe."}`)
    return { ok: false, blocking: true }
  }
}

async function validateMelhorEnvio() {
  const summary = getMelhorEnvioIntegrationSummary()
  printSection("Melhor Envio")
  printSummary(summary)

  if (summary.level !== "ok") {
    console.log("- remote-check: skipped")
    return { ok: false, blocking: false }
  }

  try {
    const response = await fetch(
      `${process.env.MELHOR_ENVIO_BASE_URL || "https://sandbox.melhorenvio.com.br/api/v2"}/me/shipment/calculate`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
          "User-Agent": "BrabusStore (jrmelo@example.com)",
        },
        body: JSON.stringify({
          from: { postal_code: "62765000" },
          to: { postal_code: "01310930" },
          products: [
            {
              id: "validation",
              quantity: 1,
              weight: 0.5,
              height: 10,
              width: 20,
              length: 20,
              insurance_value: 0,
            },
          ],
        }),
      },
    )

    if (!response.ok) {
      const payload = await response.text()
      throw new Error(payload || "Resposta inválida do Melhor Envio.")
    }

    const services = await response.json()
    console.log("- remote-check: ok")
    console.log(`- services-returned: ${Array.isArray(services) ? services.length : 0}`)
    console.log("- note: a contratação real ainda depende da URL pública homologada.")
    return { ok: true, blocking: false }
  } catch (error) {
    console.log("- remote-check: failed")
    console.log(`- error: ${error instanceof Error ? error.message : "Erro desconhecido ao validar Melhor Envio."}`)
    return { ok: false, blocking: false }
  }
}

async function validateInstagram() {
  const summary = getInstagramIntegrationSummary()
  printSection("Instagram")
  printSummary(summary)

  if (summary.mode === "graph-api") {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me/media?fields=id,media_url,permalink,thumbnail_url,media_type&limit=6&access_token=${encodeURIComponent(process.env.INSTAGRAM_ACCESS_TOKEN ?? "")}`,
      )

      if (!response.ok) {
        const payload = await response.text()
        throw new Error(payload || "Resposta inválida do Instagram.")
      }

      const payload = await response.json() as { data?: unknown[] }
      const items = Array.isArray(payload?.data) ? payload.data : []
      console.log("- remote-check: ok")
      console.log(`- media-items: ${items.length}`)
      return { ok: true, blocking: false }
    } catch (error) {
      console.log("- remote-check: failed")
      console.log(`- error: ${error instanceof Error ? error.message : "Erro desconhecido ao validar Instagram."}`)
      return { ok: false, blocking: false }
    }
  }

  if (summary.mode === "curated-fallback") {
    const posts = getCuratedInstagramFallbackPosts()
    console.log(`- fallback-items: ${posts.length}`)
    return { ok: true, blocking: false }
  }

  console.log("- remote-check: skipped")
  return { ok: false, blocking: false }
}

async function main() {
  const results = []
  results.push(await validateStripe())
  results.push(await validateMelhorEnvio())
  results.push(await validateInstagram())

  const hasBlockingFailure = results.some((result) => result.blocking && !result.ok)

  if (hasBlockingFailure) {
    process.exitCode = 1
    console.log("\nResultado final: falha bloqueante em integração obrigatória.")
    return
  }

  console.log("\nResultado final: validação concluída sem bloqueios obrigatórios.")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
