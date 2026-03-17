import { NextResponse } from "next/server"
import axios from "axios"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { toPostalCode, weightKg, height = 10, width = 20, length = 20 } = body

    if (!toPostalCode || !weightKg) {
      return NextResponse.json({ error: "CEP destino e peso são obrigatórios" }, { status: 400 })
    }

    const payload = {
      from: { postal_code: "62765000" }, // Origem: Aracoiaba-CE
      to: { postal_code: toPostalCode.replace(/\D/g, "") },
      products: [
        {
          id: "x",
          quantity: 1,
          weight: weightKg,
          height: height,
          width: width,
          length: length,
          insurance_value: 0
        }
      ]
    }

    const ME_TOKEN = process.env.MELHOR_ENVIO_TOKEN
    if (!ME_TOKEN) {
      console.warn("Melhor Envio token não configurado")
      return NextResponse.json({ services: [] }) // Fallback caso token não exista
    }

    // Usando sandbox para testes (melhorenvio.com.br/api/v2 para prod)
    const apiUrl = "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate"

    const response = await axios.post(apiUrl, payload, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${ME_TOKEN}`,
        "User-Agent": "BrabusStore (jrmelo@example.com)"
      }
    })

    const activeServices = response.data.filter((s: any) => !s.error)

    return NextResponse.json({ services: activeServices })
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error("Erro da API Melhor Envio:", error.response?.data)
    } else {
      console.error(error)
    }
    return NextResponse.json({ error: "Erro ao calcular frete" }, { status: 500 })
  }
}
