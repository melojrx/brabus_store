"use client"

import { useCartStore } from "@/store/cartStore"
import { ShoppingCart, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface ProductVariant {
  id: string
  name: string | null
  size: string | null
  color: string | null
  flavor: string | null
  stock: number
  active: boolean
}

interface Product {
  id: string
  name: string
  price: number
  images: string[]
  stock: number
  slug: string
  variants?: ProductVariant[]
}

interface AddToCartButtonProps {
  product: Product
  compact?: boolean
  selectedVariant?: ProductVariant | null
  selectionRequired?: boolean
  quantity?: number
}

export default function AddToCartButton({
  product,
  compact = false,
  selectedVariant,
  selectionRequired = false,
  quantity = 1,
}: AddToCartButtonProps) {
  const { addItem } = useCartStore()
  const router = useRouter()
  const [added, setAdded] = useState(false)
  const activeVariants = product.variants?.filter((variant) => variant.active) ?? []
  const sellableVariants = activeVariants.filter((variant) => variant.stock > 0)
  const directVariant = selectedVariant ?? (sellableVariants.length === 1 ? sellableVariants[0] : null)
  const availableStock = directVariant
    ? (directVariant.active ? directVariant.stock : 0)
    : sellableVariants.reduce((sum, variant) => sum + variant.stock, 0)
  const requiresSelection = selectionRequired && !selectedVariant
  const shouldRedirectToProduct = compact && !selectedVariant && sellableVariants.length > 1

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault() // evitar navegação se dentro de Link

    if (shouldRedirectToProduct) {
      router.push(`/products/${product.slug}`)
      return
    }

    if (requiresSelection || availableStock === 0) return

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      price: parseFloat(String(product.price)),
      quantity,
      image: product.images[0] || "/placeholder.jpg",
      stock: availableStock,
      productVariantId: directVariant?.id ?? null,
      variantName: directVariant?.name ?? null,
      selectedSize: directVariant?.size ?? undefined,
      selectedColor: directVariant?.color ?? undefined,
      selectedFlavor: directVariant?.flavor ?? undefined,
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (compact) {
    return (
      <button
        onClick={handleAddToCart}
        disabled={availableStock === 0}
        title={shouldRedirectToProduct ? "Escolher opções" : "Adicionar ao Carrinho"}
        className={`p-2 rounded-sm border transition-all ${
          added
            ? "border-green-500 bg-green-500/10 text-green-500"
            : availableStock === 0
            ? "border-gray-700 text-gray-600 cursor-not-allowed"
            : "border-[var(--color-primary)]/30 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-black"
        }`}
      >
        {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
      </button>
    )
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={requiresSelection || availableStock === 0}
      className={`w-full font-bold uppercase tracking-widest py-4 px-8 rounded-sm transition-all flex items-center justify-center gap-2 ${
        added
          ? "bg-green-500 text-white"
          : requiresSelection
          ? "bg-white/10 text-gray-400 cursor-not-allowed"
          : availableStock === 0
          ? "bg-gray-800 text-gray-500 cursor-not-allowed"
          : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black shadow-lg shadow-[var(--color-primary)]/20"
      }`}
    >
      {added ? (
        <>
          <Check className="w-5 h-5" /> Adicionado!
        </>
      ) : requiresSelection ? (
        "Selecione uma opção"
      ) : availableStock === 0 ? (
        "Esgotado"
      ) : (
        <>
          <ShoppingCart className="w-5 h-5" /> Adicionar ao Carrinho
        </>
      )}
    </button>
  )
}
