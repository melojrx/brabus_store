"use client"

import { useCartStore } from "@/store/cartStore"
import { ShoppingCart, Check, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { buildWhatsAppUrl } from "@/lib/whatsapp"

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
  onlineSalesEnabled?: boolean
  whatsapp?: string
  compact?: boolean
  selectedVariant?: ProductVariant | null
  selectionRequired?: boolean
  quantity?: number
  redirectToCart?: boolean
}

export function getAddToCartNavigation({
  redirectToCart,
  shouldRedirectToProduct,
  slug,
}: {
  redirectToCart: boolean
  shouldRedirectToProduct: boolean
  slug: string
}) {
  if (shouldRedirectToProduct) {
    return `/products/${slug}`
  }

  return redirectToCart ? "/cart" : null
}

export function getProductPurchaseAction({
  onlineSalesEnabled,
  whatsapp,
  productName,
}: {
  onlineSalesEnabled: boolean
  whatsapp: string
  productName: string
}) {
  if (!onlineSalesEnabled) {
    return {
      kind: "whatsapp" as const,
      href: buildWhatsAppUrl(whatsapp, `Olá! Tenho interesse em ${productName}.`),
    }
  }

  return { kind: "cart" as const }
}

export function addItemAndNavigate<Item>(
  addItem: (item: Item) => void,
  item: Item,
  route: string | null,
  navigate: (route: string) => void,
) {
  addItem(item)

  if (route) {
    navigate(route)
  }
}

export default function AddToCartButton({
  product,
  onlineSalesEnabled = true,
  whatsapp = "",
  compact = false,
  selectedVariant,
  selectionRequired = false,
  quantity = 1,
  redirectToCart = false,
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
  const navigation = getAddToCartNavigation({ redirectToCart, shouldRedirectToProduct, slug: product.slug })
  const purchaseAction = getProductPurchaseAction({ onlineSalesEnabled, whatsapp, productName: product.name })

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault() // evitar navegação se dentro de Link

    if (navigation?.startsWith("/products/")) {
      router.push(navigation)
      return
    }

    if (requiresSelection || availableStock === 0) return

    const item = {
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
    }

    addItemAndNavigate(addItem, item, navigation, router.push)

    if (navigation) {
      return
    }

    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (purchaseAction.kind === "whatsapp") {
    return (
      <a
        href={purchaseAction.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        aria-label={`Falar no WhatsApp sobre ${product.name}`}
        className={compact
          ? "flex items-center justify-center rounded-sm border border-green-500/50 p-2 text-green-400 transition-colors hover:bg-green-500/10"
          : "flex w-full items-center justify-center gap-2 rounded-sm bg-green-600 px-8 py-4 font-bold uppercase tracking-widest text-white transition-colors hover:bg-green-500"}
      >
        <MessageCircle className={compact ? "h-4 w-4" : "h-5 w-5"} />
        {compact ? null : "Falar no WhatsApp"}
      </a>
    )
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
