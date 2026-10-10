# Product Cost Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline, without subagents or a separate worktree. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ocultar custos de vendedores e público, preservando a operação de produtos, estoque e PDV e o acesso financeiro de ADMIN.

**Architecture:** O serializer do catálogo omite custos por padrão; leitura administrativa depende da sessão verificada no servidor. Uma função pequena protege escritas parciais de custo. Integrações utilizam os scopes existentes, com dois scopes adicionais para custos.

**Tech Stack:** Next.js 16.1.7, React 19, TypeScript, NextAuth v5, Prisma 5, PostgreSQL 16, node:test/tsx e Playwright já instalados.

## Global Constraints

- Execução inline, sem subagents e sem worktree separado.
- Trabalhar na branch `codex/restrict-product-costs`, derivada da `main`.
- Testar primeiro localmente com dados sintéticos; escrever testes de regressão antes das mudanças de comportamento.
- Não realizar push, merge, deploy ou alterações em produção nesta entrega.
- Não usar dados reais, credenciais reais, chaves de integração reais ou serviços de pagamento/notificação nos testes.
- Não criar migração de banco, novos perfis ou dependências para esta funcionalidade.
- Preservar preço de venda, estoque, variantes, filtros, imagens, PDV, pedidos e fiado.
- Preservar `Product.costPrice` e o custo histórico `OrderItem.unitCost` no banco.
- Fazer somente ajustes necessários à proteção de custos e à validação dessa proteção.

Root de todos os caminhos abaixo: `/home/jrmelo/Projetos/brabus_store`. Spec: `docs/superpowers/specs/2026-10-10-product-cost-access-design.md`. Revisão escrita da spec deve ser obtida antes da etapa 1 de implementação. Este plano não autoriza publicar a branch.

## Ambiente e comando padrão

Container local descartável já preparado: `brabus-cost-access-test`, porta de loopback 55433, banco `brabus_cost_access_e2e`. Credenciais abaixo são exclusivamente sintéticas. Antes de cada migração ou seed confirmar o host e o sufixo do banco, sem imprimir credenciais reais. Não chamar o script npm de e2e que carrega `.env`; chamar o runner diretamente com ambiente explícito.

```sh
export DATABASE_URL='postgresql://cost_test:synthetic_local@127.0.0.1:55433/brabus_cost_access_e2e?schema=public'
export DATABASE_URL_E2E="$DATABASE_URL"
export NEXTAUTH_SECRET='synthetic-local-cost-access-only'
export NEXTAUTH_URL='http://127.0.0.1:3100'
export AUTH_TRUST_HOST=true
npx prisma migrate deploy
npx prisma db seed
npm test
```

O runner precisa ter as credenciais de pagamento, e-mail, transportadora e webhook explicitamente vazias no ambiente, para impedir que o carregamento automático da .env pelo Next.js volte a preenchê-las. Na medição inicial foram substituídas por valores vazios ACCESS_TOKEN, PUBLIC_KEY, MERCADO_PAGO_ACCESS_TOKEN, MERCADO_PAGO_PUBLIC_KEY, NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY, MERCADO_PAGO_WEBHOOK_SECRET e INSTAGRAM_ACCESS_TOKEN; INTEGRATION_API_KEY_PEPPER e CRON_SECRET utilizaram valores sintéticos. A aplicação de teste não pode enviar notificações. Fixtures novas criam dados via Prisma local e não chamam serviços externos. O seed existente já fornece ADMIN e SELLER de demonstração para login.

## Task 1: Projeção segura e escrita de custo

**Files:** Create `lib/product-cost-access.ts`, `tests/product-cost-access.test.ts`; modify `lib/catalog-api.ts`; create `tests/catalog-cost-serialization.test.ts`.

**Interfaces:** `protectProductCost<T extends { costPrice: unknown }>(data: T, body: object, canWriteCosts: boolean)` retorna dados com custo apenas se o corpo original contém o campo e a escrita é autorizada. Lança `ProductCostAccessError` quando há tentativa não autorizada. `serializeProduct(product, options?: { includeCosts?: boolean })` preserva os campos comerciais existentes, omite custo por padrão e inclui custo somente para `includeCosts === true`.

- [ ] Escrever e executar primeiro os testes abaixo; esperar falha por módulo inexistente. Criar fixtures completas de ProductWithRelations no teste de serializer usando Prisma.Decimal e datas sintéticas, sem banco. Verificar ausência de propriedade, custo zero, null autorizado e manutenção de preço, categoria e variantes.

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { protectProductCost, ProductCostAccessError } from "../lib/product-cost-access"

test("preserves stored cost when the input omits it", () => {
  assert.deepEqual(protectProductCost({ name: "Synthetic", costPrice: null }, { name: "Synthetic" }, false), { name: "Synthetic" })
  assert.deepEqual(protectProductCost({ name: "Synthetic", costPrice: null }, { name: "Synthetic" }, true), { name: "Synthetic" })
})

test("denies all explicit seller cost writes", () => {
  for (const costPrice of [null, 0, 73.19]) {
    assert.throws(() => protectProductCost({ costPrice }, { costPrice }, false), ProductCostAccessError)
  }
})

test("allows an explicit administrator zero cost", () => {
  assert.deepEqual(protectProductCost({ costPrice: 0 }, { costPrice: 0 }, true), { costPrice: 0 })
})
```

Run: `node --import tsx --test tests/product-cost-access.test.ts tests/catalog-cost-serialization.test.ts`.

- [ ] Implementar somente a política testada:

```ts
export class ProductCostAccessError extends Error {
  constructor() {
    super("Sem permissão para alterar preço de custo.")
    this.name = "ProductCostAccessError"
  }
}

export function protectProductCost<T extends { costPrice: unknown }>(data: T, body: object, canWriteCosts: boolean) {
  const hasCost = Object.hasOwn(body, "costPrice")
  if (hasCost && !canWriteCosts) throw new ProductCostAccessError()
  const { costPrice, ...withoutCost } = data
  return hasCost ? { ...withoutCost, costPrice } : withoutCost
}
```

No serializer, aplicar antes do return:

```ts
const { costPrice, ...publicProduct } = product
```

Substituir apenas o spread inicial e a propriedade de custo:

```ts
...publicProduct,
price: product.price.toNumber(),
...(options.includeCosts === true ? { costPrice: costPrice?.toNumber() ?? null } : {}),
```

Manter as conversões existentes de datas, categorias e variantes. Converter TODOS os `map(serializeProduct)` para lambdas com uma política explícita; o catálogo público usa `products.map(product => serializeProduct(product))`.

- [ ] Reexecutar os testes focados e existentes; conferir que a falha do teste de serializer antes do ajuste era a presença de custo, e não fixture inválida.

## Task 2: APIs, páginas e formulário de produtos

**Files:** Modify `app/api/admin/products/route.ts`, `app/api/admin/products/[id]/route.ts`, `app/admin/products/page.tsx`, `app/admin/products/new/page.tsx`, `app/admin/products/[id]/edit/page.tsx`, `app/admin/products/ProductsManager.tsx`, `lib/product-form.ts`; modify `tests/product-form.test.ts`; create `tests/e2e/product-cost-access.spec.ts`.

**Interfaces:** Páginas enviam `canManageCosts: boolean`; tipos Product e ProductFormProduct tornam `costPrice` opcional. Funções `getProductFormErrors`, `validateProductForm` e `buildProductPayload` ganham último argumento `canManageCosts = true` para preservar os consumidores administrativos existentes.

- [ ] Adicionar testes de formulário que validam cadastro sem custo com permissão false e ausência de propriedade no payload, mantendo validação de nome, categoria, preço e variantes. Testar também o comportamento true já existente. Adicionar e2e de resposta API sem custo e campo/coluna/margem ausentes para SELLER; executar e observar falha de segurança antes da mudança.

```ts
test("seller payload omits cost and still validates commercial fields", () => {
  const form = { ...createEmptyProductForm(), name: "Synthetic", categoryId: category.id, price: "R$ 100,00", variants: [{ ...createEmptyProductForm().variants[0], size: "M", color: "Preto" }] }
  assert.equal(validateProductForm(form, category, false), null)
  assert.equal(Object.hasOwn(buildProductPayload(form, category, false), "costPrice"), false)
  assert.equal(validateProductForm(form, category, true), "Informe o preço de custo.")
})
```

- [ ] Routes retornam a sessão do guard, mantêm `isStaffRole` para operação de produtos e usam `isAdminRole` para custo. Aplicar no POST e PUT:

```ts
const canManageCosts = isAdminRole(session.user?.role)
const normalized = normalizeProductPayload(body)
const productData = protectProductCost(normalized.productData, body, canManageCosts)
const variants = normalized.variants
```

Capturar `ProductCostAccessError` como 403 antes do tratamento genérico 500. Não iniciar transação ou alterar variantes se a proteção negar. No GET/POST/PUT serializar com `{ includeCosts: canManageCosts }`. Campo ausente na gravação deve usar omissão Prisma, não recompor custo com leitura antiga que possa sobrescrever uma atualização concorrente.

- [ ] Em cada página consultar `auth()` e calcular o booleano no servidor. Serializar com a mesma política e enviar `canManageCosts` explicitamente. No componente, condicionar coluna, célula, campo e margem a esse booleano. Passá-lo às funções de validação/payload. Mapear custo opcional para formulário vazio com `product.costPrice ?? null`; exibir “Não informado” apenas ao ADMIN quando null.

- [ ] Validar POST/PUT de vendedor com custo sentinela: 403 e leitura Prisma confirma todos os dados intactos. Validar PUT sem custo sobre produto com custo 73.19 e com custo zero: ambos preservados. Validar criação sem custo, resposta sem campo, e ADMIN completando custo depois.

## Task 3: Fechar obtenção de privilégio e atualizar sessão

**Files:** Modify `app/api/admin/users/route.ts`, `app/api/admin/users/[id]/route.ts`, `app/api/admin/users/[id]/reset-password/route.ts`, `app/api/admin/integrations/api-keys/route.ts`, `app/api/admin/integrations/api-keys/[id]/revoke/route.ts`, `auth.ts`; modify `tests/auth-guard.test.ts`, `tests/e2e/product-cost-access.spec.ts`.

**Interfaces:** Guards das rotas sensíveis aceitam somente ADMIN; JWT lê papel atual por token.id no servidor. `isStaffRole` não muda.

- [ ] Antes de alterar guard, adicionar e2e que tenta GET/POST de usuários e chaves, PATCH de papel, reset de senha e revoke de chave sintética como SELLER. Usar identificadores locais reais e confirmar que a tentativa não altera nada. A execução inicial deve demonstrar o acesso indevido; restaurar apenas as fixtures sintéticas criadas para esse teste.
- [ ] Separar sessão inexistente (401) de sessão não administrativa (403), com respostas sem dados sensíveis. Padrão a aplicar em cada handler antes de ler/gravar dados:

```ts
const session = await auth()
if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
if (!isAdminRole(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
```

- [ ] No callback JWT, após preencher token.id no login, consultar o usuário atual. Usar o cliente Prisma já importado em auth.ts. Preservar phone, id e demais campos existentes:

```ts
if (typeof token.id === "string") {
  const currentUser = await prisma.user.findUnique({
    where: { id: token.id },
    select: { role: true, mustChangePassword: true },
  })
  token.role = currentUser?.role ?? "CUSTOMER"
  token.mustChangePassword = currentUser?.mustChangePassword ?? false
}
```

Não capturar erro para recuperar papel privilegiado antigo. A sessão não deve ganhar ADMIN por campo de payload cliente. O teste e2e cria usuário ADMIN dedicado, autentica, altera papel via Prisma sintético para SELLER e confirma próxima resposta de produtos sem custo e dashboard negado. Não rebaixar o ADMIN compartilhado do seed.

- [ ] Reexecutar os testes de proteção e login, incluindo destino PDV de vendedor e acesso administrativo normal.

## Task 4: Scopes específicos de integração

**Files:** Modify `app/admin/developer/api-keys/ApiKeysManager.tsx`, `app/api/v1/integrations/products/route.ts`, `app/api/v1/integrations/products/[idOrSlug]/route.ts`, `app/api/v1/integrations/orders/[idOrNumber]/route.ts`, `app/api/v1/integrations/dashboard/route.ts`; create `tests/e2e/integration-cost-access.spec.ts`.

**Interfaces:** Usar `hasScope(ctx, "read:costs")`, `hasScope(ctx, "write:costs")`, e os erros de integração existentes. `protectProductCost` recebe o corpo parseado ANTES de fallback com o custo existente. Escrita de custo e leitura de custo são independentes.

- [ ] Criar chaves sintéticas via Prisma/hashApiKey, guardadas só na memória do teste. Testar GET/POST/PATCH de produtos, detalhe de pedido e dashboard com combinações de scopes. Executar antes das mudanças: esperar exposição de custo e acesso financeiro indevidos.
- [ ] Obter contexto retornado por `requireIntegrationScope` e serializar com:

```ts
serializeProduct(product, { includeCosts: hasScope(ctx, "read:costs") })
```

No detalhe de pedidos, preservar as propriedades atuais e substituir o campo incondicional por:

```ts
...(hasScope(ctx, "read:costs") ? { unitCost: item.unitCost?.toNumber() ?? null } : {}),
```

- [ ] Proteger custo recebido em POST/PATCH usando `protectProductCost(normalized.productData, parsed.data, hasScope(ctx, "write:costs"))`. Converter ProductCostAccessError em integrationError("FORBIDDEN", error.message, 403). Na edição, retirar o fallback de custo dos dados a gravar quando o corpo omite o campo; preservar as demais regras atuais de PATCH.
- [ ] Antes da consulta do dashboard:

```ts
const ctx = await requireIntegrationScope(req, "read:dashboard")
if (!hasScope(ctx, "read:costs")) {
  throw new IntegrationAuthError("FORBIDDEN", "Missing required scope: read:costs", 403)
}
```

Adicionar à lista de scopes da tela administrativa:

```ts
{ value: "read:costs", label: "Custos (leitura)" },
{ value: "write:costs", label: "Custos (escrita)" },
```

- [ ] Reexecutar e2e: chaves sem novo scope mantêm preço/estoque e operações comuns; write:costs sem read:costs permite alterar mas resposta omite custo; read:costs sem write:costs permite ler mas alteração financeira retorna 403. Registrar no documento a mudança de contrato; não modificar chaves existentes automaticamente.

## Task 5: Aviso de custo ausente e regressão completa

**Files:** Modify `lib/admin-dashboard.ts`, `app/admin/page.tsx`, `tests/admin-dashboard.test.ts`; finish `tests/e2e/product-cost-access.spec.ts`, `tests/e2e/integration-cost-access.spec.ts`; update spec/plan with results; modify `CLAUDE.md` somente nas descrições afetadas da autorização.

**Interfaces:** `financial.missingCostItemCount` conta linhas de itens vendidos no período com unitCost null; zero explícito não entra na contagem. Pode extrair `countItemsMissingCost(items: readonly { unitCost: unknown }[]): number` para teste puro. Não alterar os cálculos financeiros ou snapshots históricos.

- [ ] Escrever teste e observar falha antes de extrair contador:

```ts
test("distinguishes missing cost from zero cost", () => {
  assert.equal(countItemsMissingCost([{ unitCost: null }, { unitCost: 0 }, { unitCost: 73.19 }]), 1)
})
```

- [ ] Implementar contador com `items.filter(item => item.unitCost == null).length`, adicioná-lo à resposta financial e renderizar aviso somente quando maior que zero na aba financeira:

```tsx
{dashboard.financial.missingCostItemCount > 0 ? (
  <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
    Custos incompletos em {dashboard.financial.missingCostItemCount} itens de venda neste período. Lucro e margem podem estar superestimados.
  </p>
) : null}
```

- [ ] Completar testes de navegador: custo sentinela ausente no HTML inicial público, páginas de detalhe, payloads de navegação Next.js e páginas/edição do vendedor. Verificar presença do campo para ADMIN. Verificar edição/cadastro pela tela, margem do ADMIN e ausência para SELLER. Conferir variantes, quantidade e preço após salvar. Testar PDV com venda sintética e snapshot interno preservado; manter execução dos testes existentes de fiado/desconto.
- [ ] Executar os gates abaixo com ambiente sintético explícito. Cada execução deve retornar zero; registrar contagem de testes, alertas existentes e duração. Um teste que falhou por setup deve ser repetido após corrigir setup, sem apresentar essa falha como comportamento da funcionalidade.

```sh
npm test
npm run lint -- .
npm run build
node --import tsx scripts/run-e2e.ts
git diff --check
```

Verificar que tests/scripts/test-ci-test-environment.sh e demais scripts de autorização relevantes não foram quebrados; registrar scripts executados. Não promover ajuste enquanto algum gate obrigatório falhar. Ausência de regressão significa aprovação da cobertura executada, não garantia para fluxos não testados.

- [ ] Fazer revisão inline do diff contra os 11 critérios da spec; confirmar cada callsite de serializeProduct e todas as respostas que contêm unitCost. Documentar ausência de exportadores e a regra para futuros exportadores. Atualizar CLAUDE.md, removendo afirmação de acesso equivalente ADMIN/SELLER para áreas financeiras/usuários/chaves.
- [ ] Criar resumo de validação em outputs do chat; copiar spec/plano atualizados para outputs. Deixar branch local e relatar arquivos, evidências e mudanças de contrato. Commits locais seguem Conventional Commits com autor `Junior Melo <jrmeloafrf@gmail.com>`; não realizar push ou merge. Container e banco descartáveis podem ser removidos após guardar evidências, sem tocar os containers preexistentes.

## Estado inicial e andamento

- [x] Checkout inspecionado: main limpa em 9cbb1ba.
- [x] Branch criada da main no checkout atual.
- [x] Banco descartável local criado; 21 migrações existentes aplicadas e seed sintético carregado.
- [x] Lint inicial: zero erros, um aviso preexistente de useEffect em DeliveriesManager.tsx.
- [x] Suite inicial com seed sintético: 88/88 testes; build passou; navegador: 11/11 testes (19,7 s).
- [ ] Revisão escrita da especificação pelo usuário, conforme brainstorming.
- [ ] Implementação das tasks 1–5 com ciclos vermelho/verde.
- [ ] Revisão final e entrega local.
