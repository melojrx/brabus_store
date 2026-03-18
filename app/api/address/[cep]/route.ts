import { NextResponse } from "next/server"

function normalizePostalCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8)
}

export async function GET(_req: Request, { params }: { params: Promise<{ cep: string }> }) {
  try {
    const { cep } = await params
    const normalizedCep = normalizePostalCode(cep)

    if (normalizedCep.length !== 8) {
      return NextResponse.json({ error: "CEP inválido." }, { status: 400 })
    }

    const response = await fetch(`https://viacep.com.br/ws/${normalizedCep}/json/`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 })
    }

    const data = (await response.json()) as Record<string, unknown>

    if (data.erro) {
      return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 })
    }

    return NextResponse.json({
      cep: typeof data.cep === "string" ? data.cep : normalizedCep,
      street: typeof data.logradouro === "string" ? data.logradouro : "",
      neighborhood: typeof data.bairro === "string" ? data.bairro : "",
      city: typeof data.localidade === "string" ? data.localidade : "",
      state: typeof data.uf === "string" ? data.uf : "",
      complement: typeof data.complemento === "string" ? data.complemento : "",
    })
  } catch (error) {
    console.error("Erro ao buscar CEP:", error)
    return NextResponse.json({ error: "Erro ao buscar CEP" }, { status: 500 })
  }
}
