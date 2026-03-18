import { NextResponse } from "next/server"
import {
  getCuratedInstagramFallbackPosts,
  getInstagramIntegrationSummary,
} from "@/lib/integration-status"

// Cache: ISR ou fetch revalidation a cada 1 hora.
export const revalidate = 3600

export async function GET() {
  try {
    const instagramSummary = getInstagramIntegrationSummary()

    if (instagramSummary.mode === "graph-api") {
      const response = await fetch(
        `https://graph.instagram.com/me/media?fields=id,media_url,permalink,thumbnail_url,media_type&limit=6&access_token=${encodeURIComponent(process.env.INSTAGRAM_ACCESS_TOKEN ?? "")}`,
        {
          next: { revalidate },
        },
      )

      if (response.ok) {
        const payload = (await response.json()) as {
          data?: Array<{
            id?: string
            media_type?: string
            media_url?: string
            thumbnail_url?: string
            permalink?: string
          }>
        }

        const items = Array.isArray(payload.data) ? payload.data : []
        const normalizedFeed = items
          .map((item, index) => {
            const mediaUrl =
              item.media_type === "VIDEO"
                ? item.thumbnail_url?.trim() || item.media_url?.trim() || ""
                : item.media_url?.trim() || ""
            const permalink = item.permalink?.trim() || ""

            if (!mediaUrl || !permalink) {
              return null
            }

            return {
              id: item.id?.trim() || `instagram-${index + 1}`,
              media_url: mediaUrl,
              permalink,
            }
          })
          .filter((item): item is { id: string; media_url: string; permalink: string } => item !== null)

        if (normalizedFeed.length > 0) {
          return NextResponse.json(normalizedFeed)
        }
      } else {
        console.error("Falha ao buscar feed real do Instagram:", await response.text())
      }
    }

    return NextResponse.json(getCuratedInstagramFallbackPosts())
  } catch (error) {
    console.error("Erro ao carregar feed do Instagram:", error)
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
