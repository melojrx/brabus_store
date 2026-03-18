"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, FolderTree, Loader2, Pencil, Plus, Tags, Trash2, X } from "lucide-react"

type ChildCategoryNode = Readonly<{
  id: string
  name: string
  slug: string
  active: boolean
  sortOrder: number
  supportsSize: boolean
  supportsColor: boolean
  supportsFlavor: boolean
  supportsWeight: boolean
  trackStockByVariant: boolean
  parentId: string | null
  _count: {
    products: number
    children: number
  }
}>

type CategoryNode = ChildCategoryNode & Readonly<{
  children: readonly ChildCategoryNode[]
}>

type CategoryForm = {
  name: string
  slug: string
  active: boolean
  parentId: string
  sortOrder: string
  supportsSize: boolean
  supportsColor: boolean
  supportsFlavor: boolean
  supportsWeight: boolean
  trackStockByVariant: boolean
}

type CategoriesManagerProps = Readonly<{
  initialCategories: readonly CategoryNode[]
}>

type FieldProps = Readonly<{
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}>

const inputCls =
  "w-full rounded bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

function createEmptyForm(parentId = ""): CategoryForm {
  return {
    name: "",
    slug: "",
    active: true,
    parentId,
    sortOrder: "0",
    supportsSize: false,
    supportsColor: false,
    supportsFlavor: false,
    supportsWeight: false,
    trackStockByVariant: false,
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

function FlagBadge({ active, label }: Readonly<{ active: boolean; label: string }>) {
  return (
    <span
      className={`rounded-sm border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${
        active
          ? "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
          : "border-zinc-800 bg-zinc-900 text-zinc-600"
      }`}
    >
      {label}
    </span>
  )
}

export default function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ChildCategoryNode | null>(null)
  const [form, setForm] = useState<CategoryForm>(createEmptyForm())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const parentCategories = initialCategories
  const totalCategories = parentCategories.reduce((sum, parent) => sum + 1 + parent.children.length, 0)
  const isSubcategory = form.parentId !== ""

  function openCreate(parentId = "") {
    setEditing(null)
    setForm(createEmptyForm(parentId))
    setError("")
    setDrawerOpen(true)
  }

  function openEdit(category: ChildCategoryNode) {
    setEditing(category)
    setForm({
      name: category.name,
      slug: category.slug,
      active: category.active,
      parentId: category.parentId ?? "",
      sortOrder: String(category.sortOrder),
      supportsSize: category.supportsSize,
      supportsColor: category.supportsColor,
      supportsFlavor: category.supportsFlavor,
      supportsWeight: category.supportsWeight,
      trackStockByVariant: category.trackStockByVariant,
    })
    setError("")
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
    setError("")
  }

  function setField<Key extends keyof CategoryForm>(key: Key, value: CategoryForm[Key]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }

      if (key === "name" && !editing && typeof value === "string") {
        next.slug = slugify(value)
      }

      if (key === "parentId" && value === "") {
        next.supportsSize = false
        next.supportsColor = false
        next.supportsFlavor = false
        next.supportsWeight = false
        next.trackStockByVariant = false
      }

      return next
    })
  }

  async function handleSave() {
    setError("")

    if (!form.name || !form.slug) {
      setError("Nome e slug são obrigatórios.")
      return
    }

    if (isSubcategory && !form.parentId) {
      setError("Selecione uma categoria pai para a subcategoria.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        active: form.active,
        parentId: form.parentId || null,
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        supportsSize: form.parentId ? form.supportsSize : false,
        supportsColor: form.parentId ? form.supportsColor : false,
        supportsFlavor: form.parentId ? form.supportsFlavor : false,
        supportsWeight: form.parentId ? form.supportsWeight : false,
        trackStockByVariant: form.parentId ? form.trackStockByVariant : false,
      }

      const url = editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories"
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        setError((await res.json()).error ?? "Erro ao salvar categoria.")
        return
      }

      closeDrawer()
      startTransition(() => router.refresh())
    } catch {
      setError("Erro de conexão.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(category: ChildCategoryNode) {
    if (!confirm(`Excluir ${category.name}?`)) {
      return
    }

    setDeletingId(category.id)
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" })
      if (!res.ok) {
        setError((await res.json()).error ?? "Erro ao excluir categoria.")
        return
      }

      startTransition(() => router.refresh())
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Tags className="h-7 w-7 text-[var(--color-primary)]" />
          <div>
            <h1 className="text-3xl font-heading uppercase tracking-wider">Categorias</h1>
            <p className="text-sm text-zinc-500">Hierarquia simples com flags por subcategoria.</p>
          </div>
          <span className="rounded-sm border border-zinc-700 px-2 py-0.5 font-mono text-xs text-zinc-500">
            {totalCategories}
          </span>
        </div>

        <button
          type="button"
          onClick={() => openCreate("")}
          className="flex items-center gap-2 bg-[var(--color-primary)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          <Plus className="h-4 w-4" /> Nova Categoria
        </button>
      </div>

      <div className="space-y-6">
        {parentCategories.map((parent) => {
          const parentDeleteBlocked = parent._count.products > 0 || parent._count.children > 0

          return (
            <section key={parent.id} className="overflow-hidden border border-zinc-800 bg-zinc-950">
              <div className="flex flex-col gap-4 border-b border-zinc-800 bg-black px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <FolderTree className="h-5 w-5 text-[var(--color-primary)]" />
                    <h2 className="text-xl font-heading uppercase tracking-[0.2em] text-white">{parent.name}</h2>
                    <span className="rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-500">
                      {parent.slug}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-sm border border-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                      {parent.children.length} subcategorias
                    </span>
                    <span className="rounded-sm border border-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                      {parent._count.products} produtos diretos
                    </span>
                    <FlagBadge active={parent.active} label={parent.active ? "Ativa" : "Inativa"} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCreate(parent.id)}
                    className="flex items-center gap-1.5 border border-[var(--color-primary)]/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] transition-all hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/10"
                  >
                    <Plus className="h-3 w-3" /> Nova Subcategoria
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(parent)}
                    className="flex items-center gap-1.5 border border-zinc-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-zinc-900"
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(parent)}
                    disabled={deletingId === parent.id || parentDeleteBlocked}
                    title={parentDeleteBlocked ? "Remova subcategorias e produtos vinculados primeiro." : "Excluir categoria"}
                    className="border border-red-500/20 p-1.5 text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-20"
                  >
                    {deletingId === parent.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="divide-y divide-zinc-800/70">
                {parent.children.length > 0 ? (
                  parent.children.map((child) => {
                    const childDeleteBlocked = child._count.products > 0 || child._count.children > 0

                    return (
                      <div key={child.id} className="grid gap-4 px-6 py-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-[var(--color-primary)]" />
                            <span className="font-semibold text-white">{child.name}</span>
                            <span className="rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-500">
                              {child.slug}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 pl-6">
                            <FlagBadge active={child.supportsSize} label="Tamanho" />
                            <FlagBadge active={child.supportsColor} label="Cor" />
                            <FlagBadge active={child.supportsFlavor} label="Sabor" />
                            <FlagBadge active={child.supportsWeight} label="Peso" />
                            <FlagBadge active={child.trackStockByVariant} label="Estoque por Variante" />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                          <span>Produtos: {child._count.products}</span>
                          <span>Ordem: {child.sortOrder}</span>
                          <span className={child.active ? "text-emerald-400" : "text-zinc-600"}>
                            {child.active ? "Ativa" : "Inativa"}
                          </span>
                        </div>

                        <div className="flex items-center justify-start gap-2 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => openEdit(child)}
                            className="flex items-center gap-1.5 border border-[var(--color-primary)]/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] transition-all hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/10"
                          >
                            <Pencil className="h-3 w-3" /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(child)}
                            disabled={deletingId === child.id || childDeleteBlocked}
                            title={childDeleteBlocked ? "Remova produtos vinculados primeiro." : "Excluir subcategoria"}
                            className="border border-red-500/20 p-1.5 text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-20"
                          >
                            {deletingId === child.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="px-6 py-10 text-sm text-zinc-600">Nenhuma subcategoria vinculada.</div>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex" style={{ height: "100dvh" }}>
          <button
            type="button"
            aria-label="Fechar painel"
            onClick={closeDrawer}
            className="flex-1 border-0 bg-black/70 p-0 backdrop-blur-sm"
          />

          <div className="relative z-10 ml-auto flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-black shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
              <h2 className="text-base font-medium text-white">{editing ? "Editar Categoria" : "Nova Categoria"}</h2>
              <button type="button" aria-label="Fechar painel" onClick={closeDrawer} className="text-zinc-500 transition-colors hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              {error ? (
                <div className="rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
                  {error}
                </div>
              ) : null}

              <Field label="Tipo de Cadastro" htmlFor="category-level">
                <select
                  id="category-level"
                  className={inputCls}
                  value={isSubcategory ? "child" : "parent"}
                  onChange={(event) => setField("parentId", event.target.value === "child" ? parentCategories[0]?.id ?? "" : "")}
                >
                  <option value="parent">Categoria Pai</option>
                  <option value="child">Subcategoria</option>
                </select>
              </Field>

              {isSubcategory ? (
                <Field label="Categoria Pai" htmlFor="category-parent">
                  <select
                    id="category-parent"
                    className={inputCls}
                    value={form.parentId}
                    onChange={(event) => setField("parentId", event.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {parentCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome" htmlFor="category-name">
                  <input
                    id="category-name"
                    className={inputCls}
                    autoFocus
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    placeholder={isSubcategory ? "Ex: Whey Protein" : "Ex: Suplementos"}
                  />
                </Field>

                <Field label="Ordem" htmlFor="category-sort-order">
                  <input
                    id="category-sort-order"
                    className={inputCls}
                    type="number"
                    value={form.sortOrder}
                    onChange={(event) => setField("sortOrder", event.target.value)}
                  />
                </Field>
              </div>

              <Field label="Slug" htmlFor="category-slug" hint="gerado automaticamente">
                <input
                  id="category-slug"
                  className={`${inputCls} font-mono`}
                  value={form.slug}
                  onChange={(event) => setField("slug", event.target.value)}
                  placeholder="whey-protein"
                />
              </Field>

              {isSubcategory ? (
                <div className="space-y-3 border border-zinc-800 bg-zinc-950 p-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Comportamento da Subcategoria</h3>
                    <p className="mt-1 text-xs text-zinc-600">Esses flags controlam os campos do produto e o editor de variantes.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input type="checkbox" checked={form.supportsSize} onChange={(event) => setField("supportsSize", event.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
                      Tamanho
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input type="checkbox" checked={form.supportsColor} onChange={(event) => setField("supportsColor", event.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
                      Cor
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input type="checkbox" checked={form.supportsFlavor} onChange={(event) => setField("supportsFlavor", event.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
                      Sabor
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input type="checkbox" checked={form.supportsWeight} onChange={(event) => setField("supportsWeight", event.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
                      Peso/Volume
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={form.trackStockByVariant}
                      onChange={(event) => setField("trackStockByVariant", event.target.checked)}
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                    Controlar estoque por variante
                  </label>
                </div>
              ) : null}

              <label className="flex items-center gap-2 pt-2 text-sm font-medium text-white">
                <input type="checkbox" checked={form.active} onChange={(event) => setField("active", event.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
                Categoria ativa
              </label>
            </div>

            <div className="flex gap-3 border-t border-zinc-800 bg-zinc-950 px-6 py-4">
              <button type="button" onClick={closeDrawer} className="flex-1 rounded border border-zinc-700 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded bg-[var(--color-primary)] py-2 text-sm font-medium text-black transition hover:brightness-110 disabled:opacity-50"
              >
                {saving || isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
