import ProductDetailClient from "./ProductDetailClient"
import Link from "next/link"

async function getProduct(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/products/${slug}`, { cache: "no-store" })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-heading mb-4">Produto não encontrado</h1>
        <Link href="/products" className="text-[var(--color-primary)] hover:underline">
          Voltar para a loja
        </Link>
      </div>
    )
  }

  return <ProductDetailClient product={product} />
}
