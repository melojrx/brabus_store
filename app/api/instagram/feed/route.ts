import { NextResponse } from "next/server"

// Cache: ISR ou fetch revalidation a cada 1 hora.
export const revalidate = 3600

export async function GET() {
  try {
    // Para simplificar, como não há um token de IG real configurado, retornaremos um JSON mockado 
    // ou uma implementação básica para Instagram Fetcher 
    // Em produção, usa-se a Graph API do IG
    
    // Dados mockados conforme instrução de que feed pode bater em API inativa (fallback no PRD)
    const mockFeed = [
      { id: "1", media_url: "https://placehold.co/400x400/000/FFF?text=Treino+1", permalink: "https://instagram.com" },
      { id: "2", media_url: "https://placehold.co/400x400/000/FFF?text=Suplementos", permalink: "https://instagram.com" },
      { id: "3", media_url: "https://placehold.co/400x400/000/FFF?text=Dica", permalink: "https://instagram.com" },
      { id: "4", media_url: "https://placehold.co/400x400/000/FFF?text=Moda", permalink: "https://instagram.com" },
      { id: "5", media_url: "https://placehold.co/400x400/000/FFF?text=Dieta", permalink: "https://instagram.com" },
      { id: "6", media_url: "https://placehold.co/400x400/000/FFF?text=Loja", permalink: "https://instagram.com" },
    ]

    return NextResponse.json(mockFeed)
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 })
  }
}
