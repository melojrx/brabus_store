"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  FolderTree,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react"

type ParentCategory = Readonly<{
  id: string
  name: string
  slug: string
}>

type Subcategory = Readonly<{
  id: string
  name: string
  slug: string
  active: boolean
  supportsSize: boolean
  supportsColor: boolean
  supportsFlavor: boolean
  supportsWeight: boolean
  trackStockByVariant: boolean
  parentId: string | null
  parent: ParentCategory | null
}>

type ProductVariant = Readonly<{
  id: string
  sku: string | null
  name: string | null
  size: string | null
  color: string | null
  flavor: string | null
  stock: number
  active: boolean
}>

type Product = Readonly<{
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
  categoryId: string
  subcategory: Subcategory
  parentCategory: ParentCategory | null
  variants: readonly ProductVariant[]
}>

type VariantForm = {
  id?: string
  sku: string
  name: string
  size: string
  color: string
  flavor: string
  stock: string
  active: boolean
}

type ProductForm = {
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
  variants: VariantForm[]
}

type FieldProps = Readonly<{
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}>

type ProductsManagerProps = Readonly<{
  initialProducts: readonly Product[]
  categories: readonly Subcategory[]
}>

const inputCls =
  "w-full rounded bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/avif"

const GENDER_OPTIONS: ReadonlyArray<Readonly<{ value: string; label: string }>> = [
  { value: "", label: "Selecione..." },
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "unissex", label: "Unissex" },
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

function getStockBadgeClass(stock: number) {
  if (stock > 10) {
    return "bg-green-500/20 text-green-500"
  }

  if (stock > 0) {
    return "bg-yellow-500/20 text-yellow-500"
  }

  return "bg-red-500/20 text-red-500"
}

function createEmptyVariant(): VariantForm {
  return {
    sku: "",
    name: "Default",
    size: "",
    color: "",
    flavor: "",
    stock: "0",
    active: true,
  }
}

function createEmptyForm(): ProductForm {
  return {
    name: "",
    slug: "",
    description: "",
    price: "",
    costPrice: "",
    images: [],
    featured: false,
    active: true,
    isNew: true,
    categoryId: "",
    weightLabel: "",
    weightKg: "",
    gender: "",
    variants: [createEmptyVariant()],
  }
}

function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-zinc-400">
        {label}
        {hint ? <span className="ml-2 text-[10px] font-normal text-zinc-600">({hint})</span> : null}
      </label>
      {children}
    </div>
  )
}

function formatCurrency(value: number) {
  return value.toFixed(2).replace(".", ",")
}

function dedupeStrings(values: readonly string[]) {
  return Array.from(new Set(values))
}

function buildVariantLabel(variant: VariantForm, category: Subcategory | undefined) {
  const parts = [
    category?.supportsFlavor ? variant.flavor : "",
    category?.supportsColor ? variant.color : "",
    category?.supportsSize ? variant.size : "",
    variant.name,
  ].filter(Boolean)

  return parts[0] ?? "Default"
}

function moveListItem<T>(items: readonly T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return [...items]
  }

  const nextItems = [...items]
  const [item] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, item)
  return nextItems
}

async function extractErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const payload = await response.json()
    if (typeof payload?.error === "string") {
      return payload.error
    }
  } catch {
    return fallbackMessage
  }

  return fallbackMessage
}

export default function ProductsManager({ initialProducts, categories }: ProductsManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(createEmptyForm())
  const [saving, setSaving] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [formError, setFormError] = useState("")
  const [listError, setListError] = useState("")
  const [sessionUploadedImages, setSessionUploadedImages] = useState<string[]>([])

  const groupedSubcategories = categories.reduce<Record<string, Subcategory[]>>((groups, category) => {
    const key = category.parent?.name ?? "Sem Categoria Pai"
    if (!groups[key]) {
      groups[key] = []
    }

    groups[key].push(category)
    return groups
  }, {})

  const selectedCategory = categories.find((category) => category.id === form.categoryId)
  const totalVariantStock = form.variants.reduce(
    (sum, variant) => sum + (Number.parseInt(variant.stock || "0", 10) || 0),
    0,
  )
  const marginPreview =
    form.price && form.costPrice && Number(form.price) > 0
      ? ((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100
      : null
  const showFashionFields = selectedCategory?.parent?.slug === "roupas-fitness"
  const isDrawerBusy = saving || uploadingImages || isPending

  async function cleanupUploadedImages(urls: readonly string[]) {
    if (urls.length === 0) {
      return
    }

    try {
      await fetch("/api/admin/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      })
    } catch {
      console.error("Falha ao limpar imagens temporárias do produto.")
    }
  }

  function openCreate() {
    setEditingProduct(null)
    setForm(createEmptyForm())
    setSessionUploadedImages([])
    setFormError("")
    setListError("")
    setDrawerOpen(true)
  }

  function openEdit(product: Product) {
    setEditingProduct(product)
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: String(product.price),
      costPrice: product.costPrice != null ? String(product.costPrice) : "",
      images: [...product.images],
      featured: product.featured,
      active: product.active,
      isNew: product.isNew,
      categoryId: product.subcategory.id,
      weightLabel: product.weightLabel ?? product.weight ?? "",
      weightKg: product.weightKg != null ? String(product.weightKg) : "",
      gender: product.gender ?? "",
      variants:
        product.variants.length > 0
          ? product.variants.map((variant) => ({
              id: variant.id,
              sku: variant.sku ?? "",
              name: variant.name ?? "Default",
              size: variant.size ?? "",
              color: variant.color ?? "",
              flavor: variant.flavor ?? "",
              stock: String(variant.stock),
              active: variant.active,
            }))
          : [{ ...createEmptyVariant(), stock: String(product.stock) }],
    })
    setSessionUploadedImages([])
    setFormError("")
    setListError("")
    setDrawerOpen(true)
  }

  function closeDrawer(cleanupSessionFiles = true) {
    if (isDrawerBusy) {
      return
    }

    if (cleanupSessionFiles && sessionUploadedImages.length > 0) {
      void cleanupUploadedImages(sessionUploadedImages)
    }

    setDrawerOpen(false)
    setEditingProduct(null)
    setSessionUploadedImages([])
    setFormError("")
  }

  function setField<Key extends keyof ProductForm>(key: Key, value: ProductForm[Key]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "name" && !editingProduct && typeof value === "string") {
        next.slug = slugify(value)
      }
      return next
    })
  }

  function setVariantField(index: number, key: keyof VariantForm, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant,
      ),
    }))
  }

  function handleCategoryChange(nextCategoryId: string) {
    const nextCategory = categories.find((category) => category.id === nextCategoryId)

    setForm((prev) => {
      const currentVariants = prev.variants.length > 0 ? prev.variants : [createEmptyVariant()]
      const normalizedVariants = currentVariants.map((variant, index) => ({
        ...variant,
        name: variant.name || (index === 0 ? "Default" : `Variante ${index + 1}`),
        size: nextCategory?.supportsSize ? variant.size : "",
        color: nextCategory?.supportsColor ? variant.color : "",
        flavor: nextCategory?.supportsFlavor ? variant.flavor : "",
      }))

      if (!nextCategory?.trackStockByVariant) {
        const collapsedStock = normalizedVariants.reduce(
          (sum, variant) => sum + (Number.parseInt(variant.stock || "0", 10) || 0),
          0,
        )

        return {
          ...prev,
          categoryId: nextCategoryId,
          variants: [
            {
              id: normalizedVariants[0]?.id,
              sku: normalizedVariants[0]?.sku ?? "",
              name: "Default",
              size: "",
              color: "",
              flavor: "",
              stock: String(collapsedStock),
              active: normalizedVariants.some((variant) => variant.active),
            },
          ],
        }
      }

      return {
        ...prev,
        categoryId: nextCategoryId,
        variants: normalizedVariants,
      }
    })
  }

  function addVariant() {
    if (!selectedCategory?.trackStockByVariant) {
      return
    }

    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          ...createEmptyVariant(),
          name: `Variante ${prev.variants.length + 1}`,
        },
      ],
    }))
  }

  function removeVariant(index: number) {
    setForm((prev) => ({
      ...prev,
      variants:
        prev.variants.length === 1
          ? prev.variants
          : prev.variants.filter((_, variantIndex) => variantIndex !== index),
    }))
  }

  function validateVariants() {
    if (!selectedCategory) {
      return "Selecione uma subcategoria."
    }

    if (form.variants.length === 0) {
      return "Cadastre ao menos uma variante."
    }

    for (const [index, variant] of form.variants.entries()) {
      if (selectedCategory.supportsSize && !variant.size.trim()) {
        return `Preencha o tamanho da variante ${index + 1}.`
      }

      if (selectedCategory.supportsColor && !variant.color.trim()) {
        return `Preencha a cor da variante ${index + 1}.`
      }

      if (selectedCategory.supportsFlavor && !variant.flavor.trim()) {
        return `Preencha o sabor da variante ${index + 1}.`
      }
    }

    return null
  }

  async function handleImageUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return
    }

    setFormError("")
    setUploadingImages(true)

    try {
      const uploadFormData = new FormData()

      Array.from(fileList).forEach((file) => {
        uploadFormData.append("files", file)
      })

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: uploadFormData,
      })

      if (!response.ok) {
        setFormError(await extractErrorMessage(response, "Não foi possível enviar as imagens."))
        return
      }

      const payload = (await response.json()) as { urls?: string[] }
      const uploadedUrls = Array.isArray(payload.urls) ? payload.urls : []

      setForm((prev) => ({
        ...prev,
        images: dedupeStrings([...prev.images, ...uploadedUrls]),
      }))
      setSessionUploadedImages((prev) => dedupeStrings([...prev, ...uploadedUrls]))
    } catch {
      setFormError("Erro de conexão ao enviar as imagens.")
    } finally {
      setUploadingImages(false)
    }
  }

  async function handleRemoveImage(index: number) {
    const imageToRemove = form.images[index]
    if (!imageToRemove) {
      return
    }

    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }))

    if (!sessionUploadedImages.includes(imageToRemove)) {
      return
    }

    setSessionUploadedImages((prev) => prev.filter((url) => url !== imageToRemove))

    try {
      await cleanupUploadedImages([imageToRemove])
    } catch {
      setFormError("A imagem foi removida da lista, mas não foi possível limpar o arquivo temporário.")
    }
  }

  function moveImage(index: number, direction: "left" | "right") {
    const targetIndex = direction === "left" ? index - 1 : index + 1

    setForm((prev) => ({
      ...prev,
      images: moveListItem(prev.images, index, targetIndex),
    }))
  }

  async function handleSave() {
    setFormError("")

    if (!form.name || !form.price || !form.costPrice || !form.categoryId) {
      setFormError("Preencha nome, preço de venda, preço de custo e subcategoria.")
      return
    }

    const variantsError = validateVariants()
    if (variantsError) {
      setFormError(variantsError)
      return
    }

    setSaving(true)
    try {
      const normalizedVariants = form.variants.map((variant, index) => ({
        ...(variant.id ? { id: variant.id } : {}),
        sku: variant.sku.trim() || null,
        name: variant.name.trim() || (index === 0 ? "Default" : `Variante ${index + 1}`),
        size: selectedCategory?.supportsSize ? variant.size.trim() || null : null,
        color: selectedCategory?.supportsColor ? variant.color.trim() || null : null,
        flavor: selectedCategory?.supportsFlavor ? variant.flavor.trim() || null : null,
        stock: Number.parseInt(variant.stock || "0", 10) || 0,
        active: variant.active,
      }))

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim(),
        price: Number.parseFloat(form.price),
        costPrice: Number.parseFloat(form.costPrice),
        images: form.images,
        featured: form.featured,
        active: form.active,
        isNew: form.isNew,
        weight: selectedCategory?.supportsWeight ? form.weightLabel.trim() || null : null,
        weightLabel: selectedCategory?.supportsWeight ? form.weightLabel.trim() || null : null,
        weightKg: form.weightKg ? Number.parseFloat(form.weightKg) : null,
        gender: showFashionFields ? form.gender || null : null,
        categoryId: form.categoryId,
        variants: normalizedVariants,
      }

      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products"
      const response = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        setFormError(await extractErrorMessage(response, "Erro ao salvar produto."))
        return
      }

      setSessionUploadedImages([])
      setDrawerOpen(false)
      setEditingProduct(null)
      setForm(createEmptyForm())
      startTransition(() => router.refresh())
    } catch {
      setFormError("Erro de conexão.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) {
      return
    }

    setListError("")
    setDeletingId(id)

    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" })

      if (!response.ok) {
        setListError(await extractErrorMessage(response, "Não foi possível excluir o produto."))
        return
      }

      startTransition(() => router.refresh())
    } catch {
      setListError("Erro de conexão ao excluir o produto.")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggle(product: Product) {
    setListError("")
    setTogglingId(product.id)

    try {
      const response = await fetch(`/api/admin/products/${product.id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active }),
      })

      if (!response.ok) {
        setListError(await extractErrorMessage(response, "Não foi possível atualizar o status do produto."))
        return
      }

      startTransition(() => router.refresh())
    } catch {
      setListError("Erro de conexão ao atualizar o status do produto.")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="h-7 w-7 text-[var(--color-primary)]" />
          <div>
            <h1 className="text-3xl font-heading uppercase tracking-wider">Produtos</h1>
            <p className="text-sm text-zinc-500">Subcategoria, imagens reais, custo e variantes operacionais.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-sm bg-[var(--color-primary)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          <Plus className="h-4 w-4" /> Novo Produto
        </button>
      </div>

      {listError ? (
        <div className="mb-6 rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {listError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-sm border border-white/5 bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-xs uppercase tracking-widest text-gray-400">
            <tr>
              <th className="px-6 py-4">Produto</th>
              <th className="px-6 py-4">Subcategoria</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Venda</th>
              <th className="px-6 py-4">Custo</th>
              <th className="px-6 py-4">Estoque</th>
              <th className="px-6 py-4">Variantes</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {initialProducts.map((product) => (
              <tr key={product.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                <td className="px-6 py-4 font-bold text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-sm bg-white/5">
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="block max-w-[220px] truncate">{product.name}</span>
                      <span className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500">{product.slug}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">{product.subcategory.name}</td>
                <td className="px-6 py-4 text-gray-500">{product.parentCategory?.name ?? "Sem pai"}</td>
                <td className="px-6 py-4">R$ {formatCurrency(product.price)}</td>
                <td className="px-6 py-4 text-zinc-400">
                  {product.costPrice != null ? `R$ ${formatCurrency(product.costPrice)}` : "—"}
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-sm px-2 py-1 text-xs font-bold ${getStockBadgeClass(product.stock)}`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-400">{product.variants.length}</td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-sm px-2 py-1 text-xs font-bold ${
                      product.active ? "bg-green-500/20 text-green-500" : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {product.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(product)}
                      disabled={togglingId === product.id}
                      className={`flex items-center gap-1 rounded-sm border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                        product.active
                          ? "border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                          : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {togglingId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
                      {product.active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="flex items-center gap-1 rounded-sm border border-[var(--color-primary)]/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                    <button
                      type="button"
                      aria-label={`Excluir ${product.name}`}
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="rounded-sm border border-red-500/30 p-1.5 text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {initialProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Fechar painel"
            onClick={() => closeDrawer()}
            disabled={isDrawerBusy}
            className="flex-1 border-0 bg-black/60 p-0 backdrop-blur-sm disabled:cursor-not-allowed"
          />

          <div className="relative z-10 ml-auto flex h-full w-full max-w-3xl flex-col border-l border-zinc-800 bg-black shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
              <div>
                <h2 className="text-base font-medium text-white">{editingProduct ? "Editar Produto" : "Novo Produto"}</h2>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">Catálogo com upload real, variantes e custo</p>
              </div>
              <button
                type="button"
                aria-label="Fechar painel"
                onClick={() => closeDrawer()}
                disabled={isDrawerBusy}
                className="text-zinc-500 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {formError ? (
                <div className="rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {formError}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome" htmlFor="product-name">
                  <input
                    id="product-name"
                    className={inputCls}
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                  />
                </Field>

                <Field label="Slug" htmlFor="product-slug" hint="gerado automaticamente">
                  <input
                    id="product-slug"
                    className={`${inputCls} font-mono`}
                    value={form.slug}
                    onChange={(event) => setField("slug", event.target.value)}
                  />
                </Field>
              </div>

              <Field label="Descrição" htmlFor="product-description">
                <textarea
                  id="product-description"
                  className={inputCls}
                  rows={3}
                  value={form.description}
                  onChange={(event) => setField("description", event.target.value)}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Field label="Preço de Venda" htmlFor="product-price">
                  <input
                    id="product-price"
                    className={inputCls}
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(event) => setField("price", event.target.value)}
                  />
                </Field>

                <Field label="Preço de Custo" htmlFor="product-cost-price">
                  <input
                    id="product-cost-price"
                    className={inputCls}
                    type="number"
                    step="0.01"
                    value={form.costPrice}
                    onChange={(event) => setField("costPrice", event.target.value)}
                  />
                </Field>

                <Field label="Estoque Total" htmlFor="product-total-stock" hint="somado das variantes">
                  <input
                    id="product-total-stock"
                    className={`${inputCls} bg-zinc-950 text-zinc-400`}
                    value={String(totalVariantStock)}
                    readOnly
                  />
                </Field>

                <Field label="Margem Bruta" htmlFor="product-margin" hint="preview">
                  <input
                    id="product-margin"
                    className={`${inputCls} bg-zinc-950 text-zinc-400`}
                    value={
                      marginPreview != null && Number.isFinite(marginPreview)
                        ? `${marginPreview.toFixed(1)}%`
                        : "—"
                    }
                    readOnly
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Subcategoria" htmlFor="product-category">
                  <select
                    id="product-category"
                    className={inputCls}
                    value={form.categoryId}
                    onChange={(event) => handleCategoryChange(event.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {Object.entries(groupedSubcategories).map(([groupLabel, items]) => (
                      <optgroup key={groupLabel} label={groupLabel}>
                        {items.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="rounded-sm border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex flex-col gap-4 border-b border-zinc-800 pb-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Imagens do Produto</h3>
                    <p className="mt-2 text-xs text-zinc-500">
                      Faça upload de JPG, PNG, WEBP ou AVIF. A primeira imagem será usada como capa.
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-[var(--color-primary)]/40 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10">
                    {uploadingImages ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                    {uploadingImages ? "Enviando..." : "Enviar Imagens"}
                    <input
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES}
                      multiple
                      className="hidden"
                      disabled={uploadingImages}
                      onChange={(event) => {
                        const { files } = event.currentTarget
                        void handleImageUpload(files)
                        event.currentTarget.value = ""
                      }}
                    />
                  </label>
                </div>

                {form.images.length > 0 ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {form.images.map((imageUrl, index) => (
                      <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-sm border border-zinc-800 bg-black/40">
                        <div className="relative aspect-square bg-zinc-950">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrl} alt={`Imagem ${index + 1}`} className="h-full w-full object-cover" />
                          {index === 0 ? (
                            <span className="absolute left-2 top-2 rounded-sm bg-[var(--color-primary)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-black">
                              Capa
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-3 p-3">
                          <p className="truncate text-xs text-zinc-500">{imageUrl.split("/").pop() || imageUrl}</p>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => moveImage(index, "left")}
                                disabled={index === 0}
                                className="rounded-sm border border-zinc-700 p-2 text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={`Mover imagem ${index + 1} para a esquerda`}
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveImage(index, "right")}
                                disabled={index === form.images.length - 1}
                                className="rounded-sm border border-zinc-700 p-2 text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={`Mover imagem ${index + 1} para a direita`}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleRemoveImage(index)}
                              className="rounded-sm border border-red-500/30 p-2 text-red-400 transition-colors hover:bg-red-500/10"
                              aria-label={`Remover imagem ${index + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-sm border border-dashed border-zinc-800 px-4 py-6 text-sm text-zinc-600">
                    Nenhuma imagem enviada. Se salvar assim, o produto usará o placeholder padrão.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Peso/Volume (display)" htmlFor="product-weight-label">
                  <input
                    id="product-weight-label"
                    className={inputCls}
                    value={form.weightLabel}
                    onChange={(event) => setField("weightLabel", event.target.value)}
                    placeholder={selectedCategory?.supportsWeight ? "Ex: 900g ou 250ml" : "Opcional"}
                  />
                </Field>

                <Field label="Peso KG (frete)" htmlFor="product-weight-kg">
                  <input
                    id="product-weight-kg"
                    className={inputCls}
                    type="number"
                    step="0.01"
                    value={form.weightKg}
                    onChange={(event) => setField("weightKg", event.target.value)}
                  />
                </Field>
              </div>

              {showFashionFields ? (
                <Field label="Gênero" htmlFor="product-gender">
                  <select
                    id="product-gender"
                    className={inputCls}
                    value={form.gender}
                    onChange={(event) => setField("gender", event.target.value)}
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value || "empty"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {selectedCategory ? (
                <div className="rounded-sm border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4 text-[var(--color-primary)]" />
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Variantes</h3>
                      </div>
                      <p className="mt-1 text-xs text-zinc-600">
                        {selectedCategory.parent?.name} / {selectedCategory.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                      <span>{selectedCategory.supportsSize ? "Tamanho" : "Sem tamanho"}</span>
                      <span>{selectedCategory.supportsColor ? "Cor" : "Sem cor"}</span>
                      <span>{selectedCategory.supportsFlavor ? "Sabor" : "Sem sabor"}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {form.variants.map((variant, index) => (
                      <div key={variant.id ?? `variant-${index}`} className="rounded-sm border border-zinc-800 bg-black/30 p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Variante {index + 1}</p>
                            <p className="mt-1 text-sm text-white">{buildVariantLabel(variant, selectedCategory)}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-xs text-zinc-400">
                              <input
                                type="checkbox"
                                checked={variant.active}
                                onChange={(event) => setVariantField(index, "active", event.target.checked)}
                                className="h-4 w-4 accent-[var(--color-primary)]"
                              />
                              Ativa
                            </label>

                            <button
                              type="button"
                              onClick={() => removeVariant(index)}
                              disabled={form.variants.length === 1}
                              className="rounded-sm border border-red-500/30 p-1.5 text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                          <Field label="Nome da Variante" htmlFor={`variant-name-${index}`} hint="interno">
                            <input
                              id={`variant-name-${index}`}
                              className={inputCls}
                              value={variant.name}
                              onChange={(event) => setVariantField(index, "name", event.target.value)}
                            />
                          </Field>

                          <Field label="SKU" htmlFor={`variant-sku-${index}`} hint="opcional">
                            <input
                              id={`variant-sku-${index}`}
                              className={inputCls}
                              value={variant.sku}
                              onChange={(event) => setVariantField(index, "sku", event.target.value)}
                            />
                          </Field>

                          <Field label="Estoque" htmlFor={`variant-stock-${index}`}>
                            <input
                              id={`variant-stock-${index}`}
                              className={inputCls}
                              type="number"
                              value={variant.stock}
                              onChange={(event) => setVariantField(index, "stock", event.target.value)}
                            />
                          </Field>
                        </div>

                        {selectedCategory.supportsSize || selectedCategory.supportsColor || selectedCategory.supportsFlavor ? (
                          <div className="mt-4 grid gap-4 lg:grid-cols-3">
                            {selectedCategory.supportsSize ? (
                              <Field label="Tamanho" htmlFor={`variant-size-${index}`}>
                                <input
                                  id={`variant-size-${index}`}
                                  className={inputCls}
                                  value={variant.size}
                                  onChange={(event) => setVariantField(index, "size", event.target.value)}
                                  placeholder="P, M, G..."
                                />
                              </Field>
                            ) : null}

                            {selectedCategory.supportsColor ? (
                              <Field label="Cor" htmlFor={`variant-color-${index}`}>
                                <input
                                  id={`variant-color-${index}`}
                                  className={inputCls}
                                  value={variant.color}
                                  onChange={(event) => setVariantField(index, "color", event.target.value)}
                                  placeholder="Preto"
                                />
                              </Field>
                            ) : null}

                            {selectedCategory.supportsFlavor ? (
                              <Field label="Sabor" htmlFor={`variant-flavor-${index}`}>
                                <input
                                  id={`variant-flavor-${index}`}
                                  className={inputCls}
                                  value={variant.flavor}
                                  onChange={(event) => setVariantField(index, "flavor", event.target.value)}
                                  placeholder="Chocolate"
                                />
                              </Field>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={addVariant}
                      disabled={!selectedCategory.trackStockByVariant}
                      className="flex items-center gap-2 rounded-sm border border-[var(--color-primary)]/40 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Variante
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-sm border border-dashed border-zinc-800 px-4 py-6 text-sm text-zinc-600">
                  Selecione uma subcategoria para configurar variantes e comportamento do produto.
                </div>
              )}

              <div className="flex flex-wrap gap-5 pt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) => setField("active", event.target.checked)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  Ativo
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(event) => setField("featured", event.target.checked)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  Destaque
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-white">
                  <input
                    type="checkbox"
                    checked={form.isNew}
                    onChange={(event) => setField("isNew", event.target.checked)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  Novo
                </label>
              </div>
            </div>

            <div className="flex gap-3 border-t border-zinc-800 bg-zinc-950 px-6 py-4">
              <button
                type="button"
                onClick={() => closeDrawer()}
                disabled={isDrawerBusy}
                className="flex-1 rounded border border-zinc-700 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isDrawerBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded bg-[var(--color-primary)] py-2 text-sm font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDrawerBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
