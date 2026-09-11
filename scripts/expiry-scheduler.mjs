import { readFile } from "node:fs/promises"

const endpoint = process.env.EXPIRY_ALERTS_ENDPOINT || "http://web:3000/api/cron/expiry-alerts"
const intervalSeconds = Number.parseInt(process.env.EXPIRY_ALERT_INTERVAL_SECONDS || "86400", 10)
const runOnce = process.env.SCHEDULER_RUN_ONCE === "1"
const secretPath = "/run/secrets/brabustore_cron_secret"

if (!Number.isFinite(intervalSeconds) || intervalSeconds < 60) {
  throw new Error("EXPIRY_ALERT_INTERVAL_SECONDS must be at least 60")
}

async function runExpiryAlerts() {
  const secret = (await readFile(secretPath, "utf8")).trim()
  if (!secret) {
    throw new Error(`Cron secret is empty: ${secretPath}`)
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new Error(`Expiry alert endpoint returned HTTP ${response.status}`)
  }

  console.log(`Expiry alert run completed with HTTP ${response.status}`)
}

if (runOnce) {
  await runExpiryAlerts()
  process.exit(0)
}

while (true) {
  try {
    await runExpiryAlerts()
  } catch (error) {
    console.error("Expiry scheduler run failed:", error instanceof Error ? error.message : error)
  }

  await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000))
}
