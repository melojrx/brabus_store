import { NextResponse } from "next/server"
import { getCatalogProducts } from "@/lib/catalog-api"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const catalog = await getCatalogProducts(searchParams)
    return NextResponse.json(catalog)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}
