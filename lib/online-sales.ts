import { NextResponse } from "next/server"

export const ONLINE_SALES_UNAVAILABLE_MESSAGE =
  "Vendas online indisponíveis no momento; compre pelo atendimento/PDV."

export function isOnlineSalesEnabled() {
  return process.env.ONLINE_SALES_ENABLED?.trim().toLowerCase() === "true"
}

export function onlineSalesUnavailableResponse() {
  return NextResponse.json(
    { error: ONLINE_SALES_UNAVAILABLE_MESSAGE, code: "ONLINE_SALES_UNAVAILABLE" },
    { status: 503 },
  )
}
