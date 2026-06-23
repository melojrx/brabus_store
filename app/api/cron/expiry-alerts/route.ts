import { NextResponse } from "next/server"
import { runExpiryAlertJob } from "@/lib/expiry-alerts"

function isAuthorized(req: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return false
  }

  const authHeader = req.headers.get("authorization")?.trim()
  return authHeader === `Bearer ${cronSecret}`
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runExpiryAlertJob()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Expiry alert cron failed:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
