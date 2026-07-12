import { formatExpiresAtInput } from "@/lib/expiry-utils"
import { formatCurrencyInputValue, parseCurrencyInputValue } from "@/lib/currency-input"

export type ProductFormCategory = Readonly<{
  id: string
  name: string
  slug: string
  supportsSize: boolean
  supportsColor: boolean
  supportsFlavor: boolean
  supportsWeight: boolean
  trackStockByVariant: boolean
  trackExpiration: boolean
  parent: Readonly<{ id: string; name: string; slug: string }> | null
}>

export type ProductFormVariant = {
  id?: string
  sku: string
  name: string
  size: string
  color: string
  flavor: string
  stock: string
  expiresAt: string
  active: boolean
}

export type ProductFormState = {
  name: string
  slug: string
  description: string
  price: string
  costPrice: string
  images: string[]
  featured: boolean
  active: boolean
  isNew: boolean
  categoryId: string
  weightLabel: string
  weightKg: string
  gender: string
  variants: ProductFormVariant[]
}

export type ProductFormProduct = Readonly<{
  id: string
  name: string
  slug: string
  description: string
  price: number
  costPrice: number | null
  stock: number
  images: readonly string[]
  featured: boolean
  active: boolean
  isNew: boolean
  weight: string | null
  weightLabel: string | null
  weightKg: number | null
  gender: string | null
  subcategory: ProductFormCategory
  variants: readonly Readonly<{
    id: string
    sku: string | null
    name: string | null
    size: string | null
    color: string | null
    flavor: string | null
    stock: number
    expiresAt: string | null
    active: boolean
  }>[]
}>

export function slugifyProductName(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-")
}

export function createEmptyProductVariant(): ProductFormVariant {
  return { sku: "", name: "Default", size: "", color: "", flavor: "", stock: "0", expiresAt: "", active: true }
}

export function createEmptyProductForm(): ProductFormState {
  return { name: "", slug: "", description: "", price: "", costPrice: "", images: [], featured: false, active: true, isNew: true, categoryId: "", weightLabel: "", weightKg: "", gender: "", variants: [createEmptyProductVariant()] }
}

export function mapProductToForm(product: ProductFormProduct): ProductFormState {
  return {
    name: product.name, slug: product.slug, description: product.description,
    price: formatCurrencyInputValue(product.price), costPrice: formatCurrencyInputValue(product.costPrice),
    images: [...product.images], featured: product.featured, active: product.active, isNew: product.isNew,
    categoryId: product.subcategory.id, weightLabel: product.weightLabel ?? product.weight ?? "",
    weightKg: product.weightKg == null ? "" : String(product.weightKg), gender: product.gender ?? "",
    variants: product.variants.length ? product.variants.map((variant) => ({ id: variant.id, sku: variant.sku ?? "", name: variant.name ?? "Default", size: variant.size ?? "", color: variant.color ?? "", flavor: variant.flavor ?? "", stock: String(variant.stock), expiresAt: formatExpiresAtInput(variant.expiresAt), active: variant.active })) : [{ ...createEmptyProductVariant(), stock: String(product.stock) }],
  }
}

export function getTotalVariantStock(variants: readonly ProductFormVariant[]) {
  return variants.reduce((sum, variant) => sum + (Number.parseInt(variant.stock || "0", 10) || 0), 0)
}

export function getGrossMargin(price: string, costPrice: string) {
  const sale = parseCurrencyInputValue(price)
  const cost = parseCurrencyInputValue(costPrice)
  return sale != null && cost != null && sale > 0 ? ((sale - cost) / sale) * 100 : null
}

export function normalizeVariantsForCategory(variants: readonly ProductFormVariant[], category?: ProductFormCategory) {
  const source = variants.length ? variants : [createEmptyProductVariant()]
  const normalized = source.map((variant, index) => ({ ...variant, name: variant.name || (index ? `Variante ${index + 1}` : "Default"), size: category?.supportsSize ? variant.size : "", color: category?.supportsColor ? variant.color : "", flavor: category?.supportsFlavor ? variant.flavor : "", expiresAt: category?.trackExpiration ? variant.expiresAt : "" }))
  if (category?.trackStockByVariant) return normalized
  return [{ id: normalized[0]?.id, sku: normalized[0]?.sku ?? "", name: "Default", size: "", color: "", flavor: "", stock: String(getTotalVariantStock(normalized)), expiresAt: category?.trackExpiration ? normalized[0]?.expiresAt ?? "" : "", active: normalized.some((variant) => variant.active) }]
}

export function validateProductForm(form: ProductFormState, category?: ProductFormCategory) {
  if (!form.name || !form.price || !form.costPrice || !form.categoryId) return "Preencha nome, preço de venda, preço de custo e subcategoria."
  if (!category) return "Selecione uma subcategoria."
  if (!form.variants.length) return "Cadastre ao menos uma variante."
  for (const [index, variant] of form.variants.entries()) {
    if (category.supportsSize && !variant.size.trim()) return `Preencha o tamanho da variante ${index + 1}.`
    if (category.supportsColor && !variant.color.trim()) return `Preencha a cor da variante ${index + 1}.`
    if (category.supportsFlavor && !variant.flavor.trim()) return `Preencha o sabor da variante ${index + 1}.`
  }
  return null
}

export function buildProductPayload(form: ProductFormState, category: ProductFormCategory) {
  const fashion = category.parent?.slug === "roupas-fitness"
  return {
    name: form.name.trim(), slug: form.slug.trim() || slugifyProductName(form.name), description: form.description.trim(),
    price: parseCurrencyInputValue(form.price), costPrice: parseCurrencyInputValue(form.costPrice), images: form.images,
    featured: form.featured, active: form.active, isNew: form.isNew,
    weight: category.supportsWeight ? form.weightLabel.trim() || null : null,
    weightLabel: category.supportsWeight ? form.weightLabel.trim() || null : null,
    weightKg: form.weightKg ? Number.parseFloat(form.weightKg) : null,
    gender: fashion ? form.gender || null : null, categoryId: form.categoryId,
    variants: form.variants.map((variant, index) => ({ ...(variant.id ? { id: variant.id } : {}), sku: variant.sku.trim() || null, name: variant.name.trim() || (index ? `Variante ${index + 1}` : "Default"), size: category.supportsSize ? variant.size.trim() || null : null, color: category.supportsColor ? variant.color.trim() || null : null, flavor: category.supportsFlavor ? variant.flavor.trim() || null : null, stock: Number.parseInt(variant.stock || "0", 10) || 0, expiresAt: category.trackExpiration ? variant.expiresAt || null : null, active: variant.active })),
  }
}
