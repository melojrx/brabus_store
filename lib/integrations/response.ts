import { NextResponse } from "next/server"

export function integrationSuccess(
  data: unknown,
  meta?: Record<string, unknown> | null,
  init?: ResponseInit,
) {
  const body: Record<string, unknown> = { ok: true, data }

  if (meta && Object.keys(meta).length > 0) {
    body.meta = meta
  }

  return NextResponse.json(body, init)
}

export function integrationError(
  code: string,
  error: string,
  status = 400,
) {
  return NextResponse.json({ ok: false, code, error }, { status })
}
