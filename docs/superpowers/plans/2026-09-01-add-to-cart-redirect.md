# Add to Cart Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redirecionar o cliente para `/cart` após adicionar um produto válido ao carrinho na página de detalhes.

**Architecture:** O componente `AddToCartButton` receberá uma prop explícita para redirecionar após a inclusão. A página de detalhes habilita a prop; cards compactos preservam o comportamento atual, inclusive o feedback visual e o redirecionamento para escolher variações.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zustand, Node test runner com tsx.

---

### Task 1: Redirecionar da página de detalhes após adição válida

**Files:**
- Modify: `components/AddToCartButton.tsx:28-132`
- Modify: `app/products/[slug]/ProductDetailClient.tsx:227-231`
- Test: validação manual em `/`, `/products/[slug]` e `/cart`

- [ ] **Step 1: Registrar a falha manual atual**

Com um produto de variante única vendável, clique em `Adicionar ao Carrinho` na página de detalhes.

Expected: o item é incluído, mas a rota permanece inalterada. Isso confirma o defeito em `handleAddToCart`.

- [ ] **Step 2: Implementar o redirecionamento mínimo**

Adicionar a prop opcional `redirectToCart?: boolean`, com padrão `false`. Depois de `addItem(...)`, redirecionar apenas quando a prop estiver habilitada:

```ts
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

if (redirectToCart) {
  router.push("/cart")
  return
}

setAdded(true)
setTimeout(() => setAdded(false), 1500)
```

Em `ProductDetailClient`, passar `redirectToCart` ao botão. Preservar `Check`, `useState`, `added`, `setAdded` e o temporizador nos cards compactos. Não alterar o bloco abaixo, que já exige escolha de variação no card compacto:

```ts
if (shouldRedirectToProduct) {
  router.push(`/products/${product.slug}`)
  return
}
```

- [ ] **Step 3: Executar checks locais**

Run: `npm run lint -- components/AddToCartButton.tsx && npm run build`

Expected: ambos terminam com exit code 0.

- [ ] **Step 4: Validar os fluxos no navegador**

1. Produto com uma variação no detalhe: adicionar e confirmar rota `/cart` com a linha criada.
2. Produto com múltiplas variações no detalhe: selecionar a variação, adicionar e confirmar rota `/cart` com a variante correta.
3. Card compacto com múltiplas variações: confirmar rota `/products/[slug]`, sem linha criada.
4. Card compacto com variante única: confirmar que permanece na página e exibe o feedback "Adicionado!".
5. Produto sem estoque ou com seleção pendente no detalhe: confirmar que não há navegação.

- [ ] **Step 5: Aguardar autorização antes de commit**

Não executar `git add`, `git commit`, `git push` ou integração em `main`. Apresentar os checks e aguardar autorização explícita.

## Plan self-review

- O único ponto de mudança é o fluxo após `addItem`; nenhum contrato de carrinho, estoque ou checkout é alterado.
- A seleção de variações é preservada antes da adição.
- O plano não tem ação de commit, conforme a política da branch atual.
