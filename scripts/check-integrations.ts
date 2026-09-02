import { MercadoPagoConfig, User } from "mercadopago"
import {
  getCuratedInstagramFallbackPosts,
  getInstagramIntegrationSummary,
  getMercadoPagoIntegrationSummary,
} from "../lib/integration-status"
import { getMercadoPagoAccessTokenFromEnv } from "../lib/mercadopago/env"

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

async function validateMercadoPago() {
  const summary = getMercadoPagoIntegrationSummary()
  printSection("Mercado Pago")
  printSummary(summary)

  if (summary.level !== "ok") {
    return { ok: false, blocking: true }
  }

  try {
    const accessToken = getMercadoPagoAccessTokenFromEnv()

    if (!accessToken) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN ou ACCESS_TOKEN não configurado.")
    }

    const client = new MercadoPagoConfig({
      accessToken,
    })
    const user = new User(client)
    const account = await user.get()

    console.log("- remote-check: ok")
    console.log(`- account-id: ${account.id ?? "unknown"}`)
    console.log(`- site-id: ${account.site_id ?? "unknown"}`)
    return { ok: true, blocking: false }
  } catch (error) {
    console.log("- remote-check: failed")
    console.log(`- error: ${error instanceof Error ? error.message : "Erro desconhecido ao validar Mercado Pago."}`)
    return { ok: false, blocking: true }
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
  results.push(await validateMercadoPago())
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
