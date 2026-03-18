"use client"

import { useState } from "react"
import Link from "next/link"

type CategoryTreeNode = {
  id: string
  name: string
  slug: string
  children: Array<{
    id: string
    name: string
    slug: string
  }>
}

const inputCls =
  "w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[var(--color-primary)]"

export default function CatalogFilters({
  categoryTree,
  currentSearch,
  currentSort,
  currentCategory,
  currentSubcategory,
  currentSize,
  availableSizes,
}: {
  categoryTree: CategoryTreeNode[]
  currentSearch: string
  currentSort: string
  currentCategory: string
  currentSubcategory: string
  currentSize: string
  availableSizes: string[]
}) {
  const [selectedCategory, setSelectedCategory] = useState(currentCategory)
  const selectedParentCategory = categoryTree.find((category) => category.slug === selectedCategory) ?? null

  return (
    <details className="rounded-sm border border-white/5 bg-zinc-950 group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
        <div>
          <h2 className="text-lg font-heading uppercase tracking-wider text-white">Filtros</h2>
          <p className="mt-1 text-sm text-gray-500">Busca, ordenação e refino por categoria e subcategoria.</p>
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] transition-transform group-open:rotate-45">
          +
        </span>
      </summary>

      <div className="border-t border-white/5 px-6 py-6">
        <form method="GET" className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <label htmlFor="catalog-search" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Buscar Produto
              </label>
              <input
                id="catalog-search"
                name="search"
                defaultValue={currentSearch}
                placeholder="Ex: creatina, top, whey"
                className={inputCls}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="catalog-sort" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Ordenação
              </label>
              <select id="catalog-sort" name="sort" defaultValue={currentSort} className={inputCls}>
                <option value="recent">Mais recentes</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="best-selling">Mais vendidos</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="catalog-category" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Categoria
              </label>
              <select
                id="catalog-category"
                name="category"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className={inputCls}
              >
                <option value="">Todas as categorias</option>
                {categoryTree.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

                {selectedParentCategory?.children.length ? (
                  <div className="space-y-2">
                <label htmlFor="catalog-subcategory" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Subcategoria
                </label>
                <select
                  id="catalog-subcategory"
                  name="subcategory"
                  defaultValue={
                    selectedParentCategory.children.some((subcategory) => subcategory.slug === currentSubcategory)
                      ? currentSubcategory
                      : ""
                  }
                  className={inputCls}
                >
                  <option value="">Todas as subcategorias</option>
                  {selectedParentCategory.children.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.slug}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
                  </div>
                ) : null}

                {availableSizes.length > 0 ? (
                  <div className="space-y-2">
                    <label htmlFor="catalog-size" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Tamanho
                    </label>
                    <select id="catalog-size" name="size" defaultValue={currentSize} className={inputCls}>
                      <option value="">Todos os tamanhos</option>
                      {availableSizes.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-sm bg-[var(--color-primary)] px-4 py-3 text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-[var(--color-primary-dark)]"
            >
              Aplicar
            </button>
            <Link
              href="/products"
              className="rounded-sm border border-white/15 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-white/30 hover:bg-white/5"
            >
              Limpar
            </Link>
          </div>
        </form>
      </div>
    </details>
  )
}
