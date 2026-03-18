"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import AddToCartButton from "@/components/AddToCartButton"

type ProductVariant = {
  id: string
  name: string | null
  size: string | null
  color: string | null
  flavor: string | null
  stock: number
  active: boolean
}

type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  stock: number
  images: string[]
  weight: string | null
  weightLabel?: string | null
  variants: ProductVariant[]
  category: {
    name: string
  }
}

function getUniqueOptionValues(variants: readonly ProductVariant[], key: "size" | "color" | "flavor") {
  return Array.from(
    new Set(
      variants
        .map((variant) => variant[key])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
    ),
  )
}

function matchesValue(variantValue: string | null, selectedValue: string | undefined) {
  if (!selectedValue) {
    return true
  }

  return variantValue === selectedValue
}

export default function ProductDetailClient({ product }: { product: Product }) {
  const activeVariants = product.variants.filter((variant) => variant.active)
  const sellableVariants = activeVariants.filter((variant) => variant.stock > 0)
  const sizeOptions = getUniqueOptionValues(activeVariants, "size")
  const colorOptions = getUniqueOptionValues(activeVariants, "color")
  const flavorOptions = getUniqueOptionValues(activeVariants, "flavor")

  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>(flavorOptions.length === 1 ? flavorOptions[0] : undefined)
  const [selectedSize, setSelectedSize] = useState<string | undefined>(sizeOptions.length === 1 ? sizeOptions[0] : undefined)
  const [selectedColor, setSelectedColor] = useState<string | undefined>(colorOptions.length === 1 ? colorOptions[0] : undefined)

  const hasPendingSelection =
    (sizeOptions.length > 1 && !selectedSize) ||
    (colorOptions.length > 1 && !selectedColor) ||
    (flavorOptions.length > 1 && !selectedFlavor)

  const selectedVariant =
    !hasPendingSelection
      ? activeVariants.find(
          (variant) =>
            matchesValue(variant.size, selectedSize) &&
            matchesValue(variant.color, selectedColor) &&
            matchesValue(variant.flavor, selectedFlavor),
        ) ?? (activeVariants.length === 1 ? activeVariants[0] : null)
      : activeVariants.length === 1
        ? activeVariants[0]
        : null

  const effectiveStock = selectedVariant?.stock ?? sellableVariants.reduce((sum, variant) => sum + variant.stock, 0)

  const isOptionAvailable = (key: "size" | "color" | "flavor", value: string) =>
    activeVariants.some((variant) => {
      if (variant.stock <= 0) {
        return false
      }

      const sizeMatches = key === "size" ? variant.size === value : matchesValue(variant.size, selectedSize)
      const colorMatches = key === "color" ? variant.color === value : matchesValue(variant.color, selectedColor)
      const flavorMatches = key === "flavor" ? variant.flavor === value : matchesValue(variant.flavor, selectedFlavor)

      return sizeMatches && colorMatches && flavorMatches
    })

  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="glass p-8 rounded-sm border border-white/5 flex items-center justify-center relative bg-white/5 aspect-square">
          {effectiveStock === 0 && (
            <span className="absolute top-4 left-4 bg-[var(--color-secondary)] text-white text-xs uppercase font-bold px-3 py-1 tracking-wider z-10 rounded-sm">
              Esgotado
            </span>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.images[0] || "/placeholder.jpg"}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex flex-col">
          <span className="text-sm text-[var(--color-primary)] uppercase font-bold tracking-widest mb-2">
            {product.category.name}
          </span>
          <h1 className="text-3xl md:text-5xl font-heading tracking-wider mb-4 uppercase">
            {product.name}
          </h1>
          <p className="text-gray-400 mb-8 max-w-lg leading-relaxed">{product.description}</p>

          <div className="text-4xl md:text-5xl font-heading tracking-wider mb-8 text-white">
            R$ {product.price.toFixed(2).replace(".", ",")}
          </div>

          <div className="space-y-6 mb-10">
            {flavorOptions.length > 0 && (
              <div>
                <h3 className="text-xs uppercase text-gray-400 font-bold mb-3 tracking-widest">
                  Sabor
                </h3>
                <div className="flex flex-wrap gap-2">
                  {flavorOptions.map((flavor) => {
                    const available = isOptionAvailable("flavor", flavor)
                    const isSelected = selectedFlavor === flavor

                    return (
                      <button
                        key={flavor}
                        type="button"
                        onClick={() => setSelectedFlavor(flavor === selectedFlavor ? undefined : flavor)}
                        disabled={!available}
                        className="border px-4 py-2 text-sm transition-colors rounded-sm uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
                        style={
                          isSelected
                            ? { borderColor: "var(--color-primary)", color: "var(--color-primary)", background: "rgba(201,168,76,0.1)" }
                            : { borderColor: "rgba(255,255,255,0.2)", color: "white" }
                        }
                      >
                        {flavor}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {sizeOptions.length > 0 && (
              <div>
                <h3 className="text-xs uppercase text-gray-400 font-bold mb-3 tracking-widest">
                  Tamanho
                </h3>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => {
                    const available = isOptionAvailable("size", size)
                    const isSelected = selectedSize === size

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size === selectedSize ? undefined : size)}
                        disabled={!available}
                        className="border w-12 h-12 flex items-center justify-center text-sm transition-colors rounded-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                        style={
                          isSelected
                            ? { borderColor: "var(--color-primary)", color: "var(--color-primary)", background: "rgba(201,168,76,0.1)" }
                            : { borderColor: "rgba(255,255,255,0.2)", color: "white" }
                        }
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {colorOptions.length > 0 && (
              <div>
                <h3 className="text-xs uppercase text-gray-400 font-bold mb-3 tracking-widest">
                  Cor
                </h3>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => {
                    const available = isOptionAvailable("color", color)
                    const isSelected = selectedColor === color

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color === selectedColor ? undefined : color)}
                        disabled={!available}
                        className="border px-4 py-2 text-sm transition-colors rounded-sm uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
                        style={
                          isSelected
                            ? { borderColor: "var(--color-primary)", color: "var(--color-primary)", background: "rgba(201,168,76,0.1)" }
                            : { borderColor: "rgba(255,255,255,0.2)", color: "white" }
                        }
                      >
                        {color}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <AddToCartButton
            product={product}
            selectedVariant={selectedVariant}
            selectionRequired={hasPendingSelection}
          />

          <div className="mt-8 pt-8 border-t border-white/10 text-sm text-gray-400 space-y-2">
            <p>
              <strong>Estoque:</strong>{" "}
              {effectiveStock > 0 ? `${effectiveStock} unidades disponíveis` : "Indisponível"}
            </p>
            {(product.weightLabel || product.weight) && (
              <p>
                <strong>Peso/Volume:</strong> {product.weightLabel || product.weight}
              </p>
            )}
            {selectedVariant?.name && selectedVariant.name !== "Default" && (
              <p>
                <strong>Variação:</strong> {selectedVariant.name}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
