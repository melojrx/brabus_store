import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { buildInstagramProfileUrl, normalizeInstagramHandle } from "@/lib/store-settings"

export async function GET() {
  try {
    const settings = await prisma.storeSettings.findFirst()
    return NextResponse.json(
      settings
        ? {
            ...settings,
            instagram: normalizeInstagramHandle(settings.instagram),
            instagramUrl: buildInstagramProfileUrl(settings.instagram),
          }
        : null,
    )
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
