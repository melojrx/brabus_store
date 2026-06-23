import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { findExpiringVariants } from "@/lib/expiry-alerts"
import { isStaffRole } from "@/lib/auth-guard"

async function checkStaff() {
  const session = await auth()
  return isStaffRole(session?.user?.role)
}

export async function GET() {
  if (!(await checkStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const items = await findExpiringVariants()
  const criticalCount = items.filter((item) => item.level === "critical").length
  const warningCount = items.filter((item) => item.level === "warning").length
  const expiredCount = items.filter((item) => item.level === "expired").length

  return NextResponse.json({
    total: items.length,
    criticalCount,
    warningCount,
    expiredCount,
    items: items.slice(0, 12),
  })
}
