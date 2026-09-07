# Admin and PDV Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the PDV horizontal overflow on notebook widths and make the responsive Admin contract reproducible with isolated browser tests.

**Architecture:** Keep the Admin shell as the only horizontal-scrolling boundary and make its PDV children shrinkable. The catalog table remains dense and scrolls inside its own wrapper; the checkout column never leaves the available Admin width. Add an isolated Playwright runner that migrates and seeds only a database whose name ends in `_e2e`, authenticates with the seeded administrator, and checks the PDV and Dashboard contracts in a real browser.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, NextAuth credentials, Prisma 5, PostgreSQL, Node test runner, Playwright.

## Global Constraints

- Work from a `codex/admin-responsiveness` branch created from the current `main`; create the worktree only at execution time according to the repository workflow.
- Do not alter Prisma schema, business APIs, sale/stock/customer/payment/title rules, or production data.
- `DATABASE_URL_E2E` is mandatory for browser tests and its database name must end in `_e2e`; the runner must fail before migration or seed when this guard is not met.
- The E2E server must use the isolated E2E database and port `3100`; never reuse a manually running development server.
- Do not solve the PDV defect with `overflow-x-hidden`; content must remain visible and operable.
- Allow horizontal scrolling only inside a dense data component such as the PDV product-table wrapper or an existing Dashboard chart/table wrapper.
- Preserve the current PDV default view, **Tabela**, and its variant-selection behavior.
- Required PDV viewports are 1280×800, 1366×768, 1440×900, and 1536×900, each with the desktop sidebar both recolhido and expandido.
- Required final gates: `npm run test:e2e`, `npm test`, `npm run lint -- .`, and `npm run build`.

---

## File Map

| File | Responsibility |
| --- | --- |
| `package.json` | Declare Playwright and `test:e2e`. |
| `package-lock.json` | Lock the approved Playwright dependency graph. |
| `.env.example` | Document `DATABASE_URL_E2E` without credentials. |
| `.gitignore` | Keep Playwright failure artifacts out of version control. |
| `scripts/run-e2e.ts` | Guard the E2E database, migrate it, seed it, then run Playwright with E2E-only environment values. |
| `playwright.config.ts` | Start an isolated Next dev server on port 3100 and configure browser-test diagnostics. |
| `tests/e2e/support/admin.ts` | Provide reproducible administrator login and layout assertions. |
| `tests/e2e/admin-responsiveness.spec.ts` | Test PDV viewports/sidebar states and Dashboard non-regression. |
| `app/admin/layout.tsx` | Expose the Admin scrolling boundary to the browser suite. |
| `app/admin/pdv/PdvManager.tsx` | Make the two-column grid shrinkable and mark the checkout/table boundaries. |

## Task 1: Isolated browser-test foundation and failing PDV regression

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `.gitignore`
- Create: `scripts/run-e2e.ts`
- Create: `playwright.config.ts`
- Create: `tests/e2e/support/admin.ts`
- Create: `tests/e2e/admin-responsiveness.spec.ts`
- Modify: `app/admin/layout.tsx`
- Modify: `app/admin/pdv/PdvManager.tsx`

**Interfaces:**
- Consumes: `DATABASE_URL_E2E`, existing `prisma/seed.ts`, seeded `admin@brabus.com` credentials, `/auth/login`, `/admin/pdv`, and the Admin sidebar button labels.
- Produces: `npm run test:e2e`, `loginAsAdmin(page, callbackPath)`, `expectNoAdminHorizontalOverflow(page)`, `expectPanelInsideAdmin(page, testId)`, and stable `data-testid` anchors.

- [ ] **Step 1: Install the browser test dependency and expose the E2E command.**

  Run:

  ```bash
  npm install -D @playwright/test
  npx playwright install chromium
  ```

  Add the script below to `package.json`:

  ```json
  "test:e2e": "node --env-file=.env --import tsx scripts/run-e2e.ts"
  ```

  Add this comment and variable to `.env.example` directly below `DATABASE_URL`:

  ```dotenv
  # Banco local exclusivo dos testes Playwright. O nome do banco deve terminar em _e2e.
  DATABASE_URL_E2E="postgresql://USER:PASSWORD@HOST:5432/brabus_store_e2e?schema=public"
  ```

  Add `/test-results` to the testing section of `.gitignore` so screenshots and traces from failed browser runs remain local artifacts.

- [ ] **Step 2: Create the guarded E2E runner before allowing any destructive seed.**

  Create `scripts/run-e2e.ts` with the following behavior:

  ```ts
  import { spawnSync } from "node:child_process"

  const databaseUrl = process.env.DATABASE_URL_E2E
  const npx = process.platform === "win32" ? "npx.cmd" : "npx"

  if (!databaseUrl) {
    throw new Error("DATABASE_URL_E2E é obrigatória para executar os testes de navegador.")
  }

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "")

  if (!databaseName.endsWith("_e2e")) {
    throw new Error("DATABASE_URL_E2E deve apontar para um banco cujo nome termina em _e2e.")
  }

  const env = {
    ...process.env,
    AUTH_TRUST_HOST: "true",
    DATABASE_URL: databaseUrl,
    NEXTAUTH_URL: "http://127.0.0.1:3100",
  }

  function run(command: string, args: string[]) {
    const result = spawnSync(command, args, { env, stdio: "inherit" })

    if (result.status !== 0) {
      process.exit(result.status ?? 1)
    }
  }

  run(npx, ["prisma", "migrate", "deploy"])
  run(npx, ["prisma", "db", "seed"])
  run(npx, ["playwright", "test", ...process.argv.slice(2)])
  ```

  The sequence is intentional: the URL guard runs before `prisma migrate deploy` and before the destructive `prisma db seed` call. The child environment replaces `DATABASE_URL` only for this E2E process tree.

- [ ] **Step 3: Configure Playwright to run its own local server.**

  Create `playwright.config.ts`:

  ```ts
  import { defineConfig } from "@playwright/test"

  export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 60_000,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: "list",
    use: {
      baseURL: "http://127.0.0.1:3100",
      screenshot: "only-on-failure",
      trace: "on-first-retry",
    },
    webServer: {
      command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  })
  ```

  The E2E server uses a production build followed by `next start` because this repository is intentionally executed in a single checkout without a second worktree. Next.js 16 places a development lock in `.next/dev`; using `next dev` here would conflict with an already running local development server.

- [ ] **Step 4: Add stable, non-visual test boundaries.**

  In `app/admin/layout.tsx`, change the existing Admin `<main>` element to:

  ```tsx
  <main data-testid="admin-main" className="min-w-0 flex-1 bg-background overflow-y-auto">
  ```

  In `app/admin/pdv/PdvManager.tsx`, add these anchors without changing user-facing copy or behavior:

  ```tsx
  <div data-testid="pdv-layout" className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
  ```

  ```tsx
  <div data-testid="pdv-product-table-scroll" className="overflow-x-auto rounded-sm border border-white/5">
  ```

  ```tsx
  <div data-testid="pdv-checkout-panel" className="space-y-6 xl:sticky xl:top-24 xl:self-start">
  ```

  The last two replacements target the existing product-table wrapper and the right-side checkout column respectively.

- [ ] **Step 5: Write reusable browser assertions.**

  Create `tests/e2e/support/admin.ts`:

  ```ts
  import { expect, type Page } from "@playwright/test"

  export async function loginAsAdmin(page: Page, callbackPath: string) {
    await page.goto(`/auth/login?callbackUrl=${encodeURIComponent(callbackPath)}`)
    await page.getByPlaceholder("seu@email.com").fill("admin@brabus.com")
    await page.getByPlaceholder("••••••••").fill("Admin@123")
    await page.getByRole("button", { name: "Entrar" }).click()
    await page.waitForURL(new RegExp(`${callbackPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`))
  }

  export async function expectNoAdminHorizontalOverflow(page: Page) {
    const adminMain = page.getByTestId("admin-main")

    await expect(adminMain).toBeVisible()
    await expect.poll(() => adminMain.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0)
  }

  export async function expectPanelInsideAdmin(page: Page, testId: string) {
    const [adminBox, panelBox] = await Promise.all([
      page.getByTestId("admin-main").boundingBox(),
      page.getByTestId(testId).boundingBox(),
    ])

    expect(adminBox).not.toBeNull()
    expect(panelBox).not.toBeNull()
    expect(panelBox!.x).toBeGreaterThanOrEqual(adminBox!.x - 1)
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(adminBox!.x + adminBox!.width + 1)
  }
  ```

- [ ] **Step 6: Write the failing regression tests for the default table view.**

  Create `tests/e2e/admin-responsiveness.spec.ts` with this PDV suite first:

  ```ts
  import { expect, test } from "@playwright/test"
  import {
    expectNoAdminHorizontalOverflow,
    expectPanelInsideAdmin,
    loginAsAdmin,
  } from "./support/admin"

  const pdvViewports = [
    { name: "1280x800", width: 1280, height: 800 },
    { name: "1366x768", width: 1366, height: 768 },
    { name: "1440x900", width: 1440, height: 900 },
    { name: "1536x900", width: 1536, height: 900 },
  ] as const

  const sidebarStates = ["recolhido", "expandido"] as const

  for (const viewport of pdvViewports) {
    for (const sidebarState of sidebarStates) {
      test(`PDV não corta checkout em ${viewport.name} com sidebar ${sidebarState}`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await loginAsAdmin(page, "/admin/pdv")
        await expect(page.getByRole("heading", { name: "PDV Balcão" })).toBeVisible()
        await expect(page.getByTestId("pdv-product-table-scroll")).toBeVisible()

        if (sidebarState === "expandido") {
          await page.getByRole("button", { name: "Expandir sidebar do admin" }).click()
        }

        await expectNoAdminHorizontalOverflow(page)
        await expectPanelInsideAdmin(page, "pdv-checkout-panel")
        await expect
          .poll(() => page.getByTestId("pdv-product-table-scroll").evaluate((element) => element.scrollWidth > element.clientWidth))
          .toBe(true)
      })
    }
  }
  ```

- [ ] **Step 7: Run the focused suite and record the expected red state.**

  Run:

  ```bash
  npm run test:e2e -- --grep=1366x768
  ```

  Expected: the two 1366 px tests FAIL at `expectNoAdminHorizontalOverflow`, because the current default table forces the PDV grid wider than `admin-main`. Do not change layout until this failure is observed.

- [ ] **Step 8: Commit the isolated test foundation.**

  ```bash
  git add package.json package-lock.json .env.example scripts/run-e2e.ts playwright.config.ts tests/e2e app/admin/layout.tsx app/admin/pdv/PdvManager.tsx
  git commit -m "test: add isolated admin browser harness"
  ```

### Task 2: Make the PDV two-column layout shrinkable

**Files:**
- Modify: `app/admin/pdv/PdvManager.tsx:668-999`
- Test: `tests/e2e/admin-responsiveness.spec.ts`

**Interfaces:**
- Consumes: `data-testid="pdv-layout"`, `data-testid="pdv-product-table-scroll"`, `data-testid="pdv-checkout-panel"`, and the failing PDV browser suite from Task 1.
- Produces: a two-column PDV whose outer Admin container has no horizontal overflow while the table wrapper retains its own overflow.

- [ ] **Step 1: Confirm the Task 1 red test still fails before changing classes.**

  Run:

  ```bash
  npm run test:e2e -- --grep=1366x768
  ```

  Expected: FAIL at the outer-overflow assertion, not at login, server startup, or product loading.

- [ ] **Step 2: Change the PDV grid and its direct columns, without altering sale logic.**

  Replace the PDV layout opening and direct-column class names with:

  ```tsx
  <div data-testid="pdv-layout" className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)]">
    <div className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
      {/* catálogo existente */}
    </div>

    <div data-testid="pdv-checkout-panel" className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
      {/* cliente, pedido, entrega e pagamento existentes */}
    </div>
  </div>
  ```

  Update the existing table wrapper to keep its scroll boundary inside the shrinkable catalog column:

  ```tsx
  <div data-testid="pdv-product-table-scroll" className="max-w-full overflow-x-auto rounded-sm border border-white/5">
    <table className="min-w-full divide-y divide-white/5 text-sm">
      {/* tabela existente */}
    </table>
  </div>
  ```

  Preserve every existing callback, state variable, product variant button, heading, payment field, and `xl` sticky behavior. Do not modify any API route or Prisma code.

- [ ] **Step 3: Run the full PDV viewport/state matrix.**

  Run:

  ```bash
  npm run test:e2e -- --grep=PDV
  ```

  Expected: 8 passing tests — four viewports multiplied by two sidebar states. Each test proves no outer Admin overflow, a fully visible checkout panel, and local product-table overflow.

- [ ] **Step 4: Manually verify the two product representations and an operational path.**

  At 1366×768 and 1536×900 with sidebar expanded:

  ```text
  1. Abra /admin/pdv como administrador.
  2. Confirme Tabela como modo inicial e alterne para Cards e de volta para Tabela.
  3. Selecione uma variante, abra Incluir Cliente e expanda Entrega e Pagamento.
  4. Confirme que nenhum painel sai da tela e que a única rolagem horizontal fica no catálogo em Tabela.
  5. Não conclua uma venda durante esta verificação.
  ```

- [ ] **Step 5: Commit the layout correction.**

  ```bash
  git add app/admin/pdv/PdvManager.tsx tests/e2e/admin-responsiveness.spec.ts
  git commit -m "fix: make PDV layout responsive"
  ```

### Task 3: Add Dashboard non-regression coverage and run release gates

**Files:**
- Modify: `tests/e2e/admin-responsiveness.spec.ts`
- Test: `tests/e2e/admin-responsiveness.spec.ts`

**Interfaces:**
- Consumes: `loginAsAdmin`, `expectNoAdminHorizontalOverflow`, and `data-testid="admin-main"` from Task 1.
- Produces: browser coverage of the four Dashboard tabs and final evidence that the change does not affect business or build paths.

- [ ] **Step 1: Add Dashboard tab coverage at notebook width.**

  Append this suite to `tests/e2e/admin-responsiveness.spec.ts`:

  ```ts
  const dashboardTabs = [
    { name: "Visão Geral", path: "/admin" },
    { name: "Financeiro", path: "/admin?tab=financial" },
    { name: "Comercial", path: "/admin?tab=commercial" },
    { name: "Estoque", path: "/admin?tab=stock" },
  ] as const

  test("Dashboard mantém rolagem horizontal dentro dos próprios componentes", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await loginAsAdmin(page, "/admin")

    for (const tab of dashboardTabs) {
      await page.goto(tab.path)
      await expect(page.getByRole("link", { name: tab.name, exact: true })).toBeVisible()
      await expectNoAdminHorizontalOverflow(page)
    }
  })
  ```

- [ ] **Step 2: Run the focused Dashboard test.**

  Run:

  ```bash
  npm run test:e2e -- --grep=Dashboard
  ```

  Expected: PASS. If it fails due to outer `admin-main` overflow, first identify the responsible chart or table wrapper and restrict overflow to that component; do not weaken the assertion.

- [ ] **Step 3: Run the complete automated release gate.**

  Run:

  ```bash
  npm run test:e2e
  npm test
  npm run lint -- .
  npm run build
  git diff --check
  ```

  Expected: E2E, unit tests, lint, build, and whitespace validation all exit with code 0. Record any pre-existing lint warning separately; do not call it introduced by this work.

- [ ] **Step 4: Perform the final manual acceptance matrix.**

  ```text
  PDV: 1280×800, 1366×768, 1440×900, 1536×900; sidebar recolhida e expandida; Tabela e Cards.
  Dashboard: 1366×768; Visão Geral, Financeiro, Comercial e Estoque.
  Operação: selecionar variante, consultar cliente, abrir pedido, entrega e pagamento; não concluir venda.
  Expected: conteúdo operacional acessível; rolagem horizontal apenas local nos dados densos; nenhuma regra de negócio acionada.
  ```

- [ ] **Step 5: Commit the Dashboard contract tests.**

  ```bash
  git add tests/e2e/admin-responsiveness.spec.ts
  git commit -m "test: cover admin responsive contract"
  ```
