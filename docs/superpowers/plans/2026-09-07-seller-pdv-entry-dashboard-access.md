# Vendedor: entrada pelo PDV e acesso exclusivo à dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer com que vendedores iniciem sempre no PDV e garantir que apenas administradores visualizem ou consultem a dashboard.

**Architecture:** A autorização de equipe continua separada da autorização de dashboard: `isStaffRole` mantém o acesso existente ao PDV, enquanto `isAdminRole` protege a página e a API da dashboard. Um helper puro resolve o destino pós-login de forma segura; o vendedor recebe `/admin/pdv` antes de qualquer `callbackUrl` e os demais perfis usam somente caminhos internos válidos.

**Tech Stack:** Next.js 16 App Router, NextAuth v5, TypeScript, Prisma/PostgreSQL, Node test runner, Playwright.

## Global Constraints

- Não alterar esquema Prisma, migrations, regras de venda, estoque, títulos, checkout ou clientes.
- Manter `SELLER` com os acessos administrativos atuais, exceto a dashboard e sua API.
- Vendedor sempre termina o login em `/admin/pdv`, inclusive quando a URL recebida contém outro destino.
- Dashboard server-side e `/api/admin/dashboard` aceitam somente `ADMIN`.
- Aceitar `callbackUrl` somente como rota relativa interna; nunca encaminhar para URL externa ou página de autenticação.
- Testes Playwright usam exclusivamente `DATABASE_URL_E2E` cujo banco termina em `_e2e`.
- Preservar os arquivos não rastreados do usuário em `docs/superpowers/plans/2026-09-06-*.md`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `lib/auth-guard.ts` | Distinguir acesso de equipe de acesso exclusivo de administrador. |
| `lib/post-login-destination.ts` | Resolver, sem dependência de React, o destino seguro após autenticação. |
| `app/auth/login/page.tsx` | Obter a sessão criada pelo login e navegar para o destino resolvido. |
| `proxy.ts` | Desviar vendedor autenticado de `/admin` para o PDV antes de renderizar a dashboard. |
| `app/admin/page.tsx` | Reutilizar a regra de administrador como defesa server-side da dashboard. |
| `app/api/admin/dashboard/route.ts` | Responder 401 sem sessão, 403 para vendedor e dados somente para administrador. |
| `app/account/page.tsx` | Levar o vendedor diretamente ao PDV pelo atalho de conta. |
| `prisma/seed.ts` | Disponibilizar um vendedor sintético vinculado para os testes autenticados locais. |
| `tests/auth-guard.test.ts` | Cobrir a regra de administrador sem banco ou navegador. |
| `tests/post-login-destination.test.ts` | Cobrir perfil, retorno interno e rejeição de URLs inseguras. |
| `tests/e2e/support/admin.ts` | Centralizar login do vendedor para os testes Playwright. |
| `tests/e2e/seller-dashboard-access.spec.ts` | Validar o fluxo autenticado de vendedor e a continuidade do administrador. |

## Task 1: regras puras de perfil e destino pós-login

**Files:**

- Create: `lib/post-login-destination.ts`
- Create: `tests/auth-guard.test.ts`
- Create: `tests/post-login-destination.test.ts`
- Modify: `lib/auth-guard.ts`

**Interfaces:**

- Consumes: valores de perfil da sessão (`"ADMIN" | "SELLER" | "CUSTOMER" | undefined | null`) e o `callbackUrl` textual da tela de login.
- Produces: `isAdminRole(role): boolean` e `resolvePostLoginDestination(role, callbackUrl): string`, reutilizáveis por páginas e testes sem banco.

- [ ] **Step 1: escrever os testes que devem falhar**

Criar `tests/auth-guard.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { isAdminRole, isStaffRole } from "../lib/auth-guard"

test("separa administrador de acesso geral de equipe", () => {
  assert.equal(isAdminRole("ADMIN"), true)
  assert.equal(isAdminRole("SELLER"), false)
  assert.equal(isAdminRole("CUSTOMER"), false)
  assert.equal(isStaffRole("SELLER"), true)
})
```

Criar `tests/post-login-destination.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { resolvePostLoginDestination } from "../lib/post-login-destination"

test("leva vendedor ao PDV independentemente do destino informado", () => {
  assert.equal(resolvePostLoginDestination("SELLER", null), "/admin/pdv")
  assert.equal(resolvePostLoginDestination("SELLER", "/admin"), "/admin/pdv")
  assert.equal(resolvePostLoginDestination("SELLER", "/checkout"), "/admin/pdv")
})

test("mantém destinos internos válidos para administrador e cliente", () => {
  assert.equal(resolvePostLoginDestination("ADMIN", null), "/admin")
  assert.equal(resolvePostLoginDestination("ADMIN", "/admin/orders?page=2"), "/admin/orders?page=2")
  assert.equal(resolvePostLoginDestination("CUSTOMER", "/checkout"), "/checkout")
  assert.equal(resolvePostLoginDestination("CUSTOMER", null), "/")
})

test("descarta retornos externos e páginas de autenticação", () => {
  assert.equal(resolvePostLoginDestination("ADMIN", "https://example.com"), "/admin")
  assert.equal(resolvePostLoginDestination("CUSTOMER", "//example.com"), "/")
  assert.equal(resolvePostLoginDestination("CUSTOMER", "/auth/login"), "/")
})
```

- [ ] **Step 2: executar os testes para confirmar a falha inicial**

Run: `npm test -- tests/auth-guard.test.ts tests/post-login-destination.test.ts`

Expected: FAIL porque `isAdminRole` e `lib/post-login-destination.ts` ainda não existem.

- [ ] **Step 3: implementar o mínimo necessário**

Em `lib/auth-guard.ts`, manter `isStaffRole` e adicionar:

```ts
export function isAdminRole(role: string | undefined | null): boolean {
  return role === "ADMIN"
}
```

Criar `lib/post-login-destination.ts`:

```ts
type AuthenticatedRole = "ADMIN" | "SELLER" | "CUSTOMER" | undefined | null

function getSafeInternalPath(callbackUrl: string | null): string | null {
  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return null
  }

  const url = new URL(callbackUrl, "http://localhost")
  if (url.pathname.startsWith("/auth/")) {
    return null
  }

  return `${url.pathname}${url.search}${url.hash}`
}

export function resolvePostLoginDestination(role: AuthenticatedRole, callbackUrl: string | null): string {
  if (role === "SELLER") {
    return "/admin/pdv"
  }

  const safeCallbackPath = getSafeInternalPath(callbackUrl)
  if (safeCallbackPath) {
    return safeCallbackPath
  }

  return role === "ADMIN" ? "/admin" : "/"
}
```

- [ ] **Step 4: executar novamente os testes focados**

Run: `npm test -- tests/auth-guard.test.ts tests/post-login-destination.test.ts`

Expected: PASS para todos os cenários de perfil, retorno interno e URL insegura.

- [ ] **Step 5: criar o commit da etapa**

```bash
git add lib/auth-guard.ts lib/post-login-destination.ts tests/auth-guard.test.ts tests/post-login-destination.test.ts
git commit -m "feat: resolve seller login destination"
```

## Task 2: preparar o cenário autenticado de vendedor e os testes de integração

**Files:**

- Modify: `prisma/seed.ts`
- Modify: `tests/e2e/support/admin.ts`
- Create: `tests/e2e/seller-dashboard-access.spec.ts`

**Interfaces:**

- Consumes: o seed isolado chamado por `npm run test:e2e` e as rotas atuais de login, dashboard e PDV.
- Produces: usuário sintético `seller@brabus.com`, helper `loginAsSeller(page, callbackPath?)` e uma prova E2E vermelha que exercita login, menu, rota e API.

- [ ] **Step 1: escrever o teste E2E que deve falhar**

Em `tests/e2e/support/admin.ts`, adicionar o helper:

```ts
export async function loginAsSeller(page: Page, callbackPath?: string) {
  const loginPath = callbackPath
    ? `/auth/login?callbackUrl=${encodeURIComponent(callbackPath)}`
    : "/auth/login"

  await page.goto(loginPath)
  await page.getByPlaceholder("seu@email.com").fill("seller@brabus.com")
  await page.getByPlaceholder("••••••••").fill("Seller@123")
  await page.getByRole("button", { name: "Entrar" }).click()
}
```

Criar `tests/e2e/seller-dashboard-access.spec.ts`:

```ts
import { expect, test } from "@playwright/test"
import { loginAsSeller } from "./support/admin"

test("vendedor sempre inicia no PDV e não vê nem consulta a dashboard", async ({ page }) => {
  await loginAsSeller(page, "/admin")
  await page.waitForURL(/\/admin\/pdv$/)
  await expect(page.getByRole("heading", { name: "PDV Balcão" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0)

  await page.goto("/admin")
  await page.waitForURL(/\/admin\/pdv$/)

  const response = await page.request.get("/api/admin/dashboard")
  expect(response.status()).toBe(403)
  await expect(response.json()).resolves.toEqual({ error: "Forbidden" })
})

test("vendedor não altera a dashboard padrão do administrador", async ({ page }) => {
  await page.goto("/auth/login")
  await page.getByPlaceholder("seu@email.com").fill("admin@brabus.com")
  await page.getByPlaceholder("••••••••").fill("Admin@123")
  await page.getByRole("button", { name: "Entrar" }).click()
  await page.waitForURL(/\/admin$/)
  await expect(page.getByRole("heading", { name: /Dashboard Admin/i })).toBeVisible()

  const response = await page.request.get("/api/admin/dashboard")
  expect(response.status()).toBe(200)
})
```

- [ ] **Step 2: executar para confirmar a falha inicial**

Run: `npm run test:e2e -- --grep=dashboard`

Expected: FAIL porque ainda não existe a credencial de vendedor no seed.

- [ ] **Step 3: adicionar a conta sintética apenas ao seed local**

Em `prisma/seed.ts`, antes de apagar `users`, apagar `sellers` depois de apagar pedidos para manter o seed repetível:

```ts
await prisma.seller.deleteMany()
await prisma.user.deleteMany()
```

Após criar o administrador, criar o vendedor e seu cadastro vinculado:

```ts
const seller = await prisma.user.create({
  data: {
    name: "Vendedor Brabus",
    email: "seller@brabus.com",
    password: await bcrypt.hash("Seller@123", 10),
    role: Role.SELLER,
    seller: {
      create: {
        name: "Vendedor Brabus",
        email: "seller@brabus.com",
      },
    },
  },
})
console.log(`Seller created: ${seller.email}`)
```

- [ ] **Step 4: executar novamente para provar a falha de autorização e destino padrão**

Run: `npm run test:e2e -- --grep=dashboard`

Expected: FAIL porque o vendedor ainda recebe dados com status 200 na API da dashboard e o administrador ainda termina em `/` no login sem `callbackUrl`.

- [ ] **Step 5: criar o commit da etapa de teste**

```bash
git add prisma/seed.ts tests/e2e/support/admin.ts tests/e2e/seller-dashboard-access.spec.ts
git commit -m "test: add seller dashboard access coverage"
```

## Task 3: aplicar a autorização exclusiva e o fluxo de entrada

**Files:**

- Modify: `proxy.ts`
- Modify: `app/admin/page.tsx`
- Modify: `app/api/admin/dashboard/route.ts`
- Modify: `app/auth/login/page.tsx`
- Modify: `app/account/page.tsx`

**Interfaces:**

- Consumes: `isAdminRole` e `resolvePostLoginDestination` da Task 1; o cenário E2E vermelho da Task 2; sessão NextAuth.
- Produces: dashboard inacessível a `SELLER`, API com resposta 401/403 precisa, login com prioridade ao PDV e atalho de conta coerente.

- [ ] **Step 1: confirmar a falha integrada antes da alteração**

Run: `npm run test:e2e -- --grep=dashboard`

Expected: FAIL pelos dois comportamentos documentados na Task 2: API 200 para vendedor e administrador terminando na loja.

- [ ] **Step 2: implementar as barreiras de servidor e o destino pós-login**

Em `proxy.ts`, depois do bloqueio de não-equipe e antes da regra de troca obrigatória de senha, incluir a proteção restrita à rota raiz da dashboard:

```ts
if (isLoggedIn && pathname === "/admin" && req.auth?.user?.role === "SELLER") {
  return Response.redirect(new URL("/admin/pdv", req.nextUrl))
}
```

Em `app/admin/page.tsx`, importar `isAdminRole` e usar a regra centralizada:

```ts
if (!session || !isAdminRole(session.user?.role)) {
  redirect(session?.user?.role === "SELLER" ? "/admin/pdv" : "/")
}
```

Em `app/api/admin/dashboard/route.ts`, separar ausência de sessão de perfil não autorizado antes de consultar o banco:

```ts
const session = await auth()
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

if (!isAdminRole(session.user?.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

Em `app/auth/login/page.tsx`, remover o fallback local `|| "/"`, importar `getSession` e `resolvePostLoginDestination`, e substituir o redirecionamento de sucesso por:

```ts
const session = await getSession()
router.push(resolvePostLoginDestination(session?.user?.role, callbackUrl))
router.refresh()
```

Em `app/account/page.tsx`, calcular o destino do botão com o perfil da sessão e usar `/admin/pdv` para `SELLER`:

```ts
const adminLink = session.user.role === "SELLER" ? "/admin/pdv" : "/admin"
```

```tsx
<Link href={adminLink} className="flex items-center gap-2 rounded-sm bg-[var(--color-primary)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-black">
```

- [ ] **Step 3: executar os testes unitários e E2E focados**

Run: `npm test -- tests/auth-guard.test.ts tests/post-login-destination.test.ts`

Expected: PASS; o helper de destino e a regra exclusiva de administrador permanecem cobertos.

Run: `npm run test:e2e -- --grep=dashboard`

Expected: PASS; vendedor chega ao PDV, não vê dashboard, recebe 403 da API e administrador recebe 200.

- [ ] **Step 4: criar o commit da etapa**

```bash
git add proxy.ts app/admin/page.tsx app/api/admin/dashboard/route.ts app/auth/login/page.tsx app/account/page.tsx
git commit -m "feat: restrict dashboard to admins"
```

## Task 4: validação integral e revisão de regressão

**Files:**

- Modify: nenhum.

**Interfaces:**

- Consumes: todas as alterações e testes das Tasks 1 a 3.
- Produces: evidência local de que os perfis, a dashboard, o PDV e os fluxos existentes continuam íntegros.

- [ ] **Step 1: executar a suíte de testes unitários completa**

Run: `npm test`

Expected: PASS sem falhas, incluindo os novos testes de autorização e destino pós-login.

- [ ] **Step 2: executar a suíte Playwright completa no banco isolado**

Run: `npm run test:e2e`

Expected: PASS; o runner aplica migrations e seed apenas em `DATABASE_URL_E2E`, que termina em `_e2e`.

- [ ] **Step 3: executar qualidade estática e build de produção**

Run: `npm run lint -- . && npm run build && git diff --check`

Expected: lint sem erros, build concluído e nenhuma falha de whitespace no diff.

- [ ] **Step 4: fazer a checagem manual autenticada**

1. Entrar como `seller@brabus.com` com a senha de teste local e confirmar abertura imediata do PDV.
2. Tentar `/admin` como vendedor e confirmar retorno ao PDV.
3. Confirmar ausência de “Dashboard” no menu do vendedor e resposta 403 em `/api/admin/dashboard` autenticada.
4. Entrar como administrador e confirmar dashboard, suas abas e dados carregando normalmente.
5. Entrar como cliente e confirmar que `callbackUrl=/checkout` mantém o fluxo de checkout.

## Revisão do plano

- Cobertura da especificação: Task 1 trata a separação de perfis e o destino seguro; Task 2 prepara a prova integrada e a conta sintética; Task 3 implementa bloqueio de página, rota, API, entrada e atalho; Task 4 preserva cliente, administrador e gates completos.
- Sem placeholders de implementação: todos os novos helpers, respostas HTTP, testes, arquivos e comandos foram definidos acima.
- Consistência: `isAdminRole`, `resolvePostLoginDestination`, `loginAsSeller`, `seller@brabus.com`, `Seller@123` e a resposta `{ error: "Forbidden" }` usam o mesmo nome e contrato em todas as tarefas.
