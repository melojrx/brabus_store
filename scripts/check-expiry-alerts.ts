import { runExpiryAlertJob } from "@/lib/expiry-alerts"

async function main() {
  const result = await runExpiryAlertJob()

  console.log("Expiry alert job finished:")
  console.log(JSON.stringify(result, null, 2))

  if (result.notified === 0 && result.scanned > 0) {
    console.log("No new notifications sent (duplicates or already notified today).")
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
