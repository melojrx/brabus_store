# Design: Redirecionamento ao Carrinho Após Inclusão

**Data:** 2026-09-01
**Status:** Aprovado para planejamento

## Objetivo

Levar o cliente automaticamente para `/cart` após adicionar ao carrinho um produto com variação já definida na página de detalhes do produto.

## Comportamento

- Após `addItem` concluir na página de detalhes para um produto vendável com variação definida, navegar imediatamente para `/cart`.
- Os cards compactos da página inicial preservam integralmente o comportamento atual, inclusive o redirecionamento para `/products/[slug]` quando há múltiplas variações vendáveis sem seleção definida.
- Produtos sem estoque ou com seleção obrigatória pendente permanecem sem navegação.
- O estado do carrinho continua sendo mantido exclusivamente por `useCartStore`.

## Implementação

- Alterar `components/AddToCartButton.tsx` e passar uma intenção explícita de redirecionamento a partir de `app/products/[slug]/ProductDetailClient.tsx`.
- Chamar `router.push("/cart")` depois de `addItem` somente quando a intenção estiver habilitada.
- Preservar o feedback temporário "Adicionado!" nos cards compactos, que não redirecionam ao carrinho.

## Validação

- Teste unitário ou de componente para confirmar a navegação após inclusão válida.
- `npm test`, `npm run lint -- components/AddToCartButton.tsx` e `npm run build` aprovados.

## Fluxo de trabalho

- Implementar na branch atual `feat/checkout-mercadopago-go-live`, sem worktree separado.
- Não criar commit, push ou integração em `main` sem autorização explícita.
