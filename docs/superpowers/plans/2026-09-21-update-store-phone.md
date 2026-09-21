# Atualização do Telefone da Loja Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar o telefone comercial e WhatsApp públicos da Brabus para `(85) 92100-2688`, usando `5585921002688` nos links, sem alterar contatos personalizados ou dados de pessoas.

**Architecture:** `StoreSettings.whatsapp` continua a fonte de verdade. Um fallback centralizado alimenta as páginas server-rendered e uma função de formatação apresenta o número brasileiro; os links continuam passando por `buildWhatsAppUrl`. Uma migration altera o default e migra exclusivamente o valor legado da loja.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma/PostgreSQL, Node test runner, ESLint.

---

## Estrutura de arquivos

- `lib/store-settings.ts`: declara o fallback da loja e formata o WhatsApp para exibição.
- `app/contato/page.tsx`, `app/loja/page.tsx`, `components/Footer.tsx`: consomem a configuração pública, sem números literais.
- `prisma/schema.prisma`, `prisma/seed.ts`: usam o novo número como default para instalações novas.
- `prisma/migrations/20260921120000_update_store_settings_whatsapp/migration.sql`: atualiza o default e somente registros com o número legado.
- `tests/whatsapp.test.ts`, `tests/store-settings.test.ts`: cobrem normalização, URL, formato brasileiro e fallback.
- `docs/PRD.md`, `docs/prompt-ecommerce-v2.md`: atualizam o contato atual; planos e migrations históricas permanecem inalterados.

### Task 1: Cobrir o novo número e a apresentação pública

**Files:**
- Modify: `tests/whatsapp.test.ts:5-10`
- Create: `tests/store-settings.test.ts`
- Modify: `lib/store-settings.ts:3-7,38-68`

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/whatsapp.test.ts`, substituir a expectativa pelo novo número:

```ts
test("builds a WhatsApp URL from StoreSettings digits and contextual message", () => {
  assert.equal(
    buildWhatsAppUrl("(85) 92100-2688", "Olá! Tenho interesse em Whey Pro."),
    "https://wa.me/5585921002688?text=Ol%C3%A1%21+Tenho+interesse+em+Whey+Pro.",
  )
})
```

Criar `tests/store-settings.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { DEFAULT_STORE_WHATSAPP, formatStoreWhatsApp } from "../lib/store-settings"

test("uses the new store WhatsApp fallback", () => {
  assert.equal(DEFAULT_STORE_WHATSAPP, "5585921002688")
})

test("formats the store WhatsApp for Brazilian display", () => {
  assert.equal(formatStoreWhatsApp("5585921002688"), "(85) 92100-2688")
})
```

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run: `npm test -- tests/whatsapp.test.ts tests/store-settings.test.ts`

Expected: FAIL porque `DEFAULT_STORE_WHATSAPP` e `formatStoreWhatsApp` ainda não existem e a URL esperada ainda usa o número antigo.

- [ ] **Step 3: Implementar o fallback e o formatador mínimo**

Em `lib/store-settings.ts`, adicionar as constantes e o formatador antes de `normalizeInstagramHandle`:

```ts
export const DEFAULT_STORE_WHATSAPP = "5585921002688"

export function formatStoreWhatsApp(value: string | null | undefined) {
  const digits = (value ?? DEFAULT_STORE_WHATSAPP).replace(/\D/g, "")
  const localNumber = digits.startsWith("55") ? digits.slice(2) : digits

  return localNumber.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3")
}
```

Trocar o fallback no retorno de `getPublicStoreSettings`:

```ts
whatsapp: settings?.whatsapp ?? DEFAULT_STORE_WHATSAPP,
```

- [ ] **Step 4: Executar os testes para confirmar o sucesso**

Run: `npm test -- tests/whatsapp.test.ts tests/store-settings.test.ts`

Expected: PASS, com a URL `wa.me/5585921002688` e a apresentação `(85) 92100-2688`.

- [ ] **Step 5: Commitar a etapa**

```bash
git add lib/store-settings.ts tests/whatsapp.test.ts tests/store-settings.test.ts
```

### Task 2: Tornar as superfícies públicas dinâmicas

**Files:**
- Modify: `components/Footer.tsx:1-33`
- Modify: `app/contato/page.tsx:1-59`
- Modify: `app/loja/page.tsx:1-45`

- [ ] **Step 1: Escrever os testes de renderização que falham**

Criar os casos em `tests/store-settings.test.ts` que confirmam o contrato das superfícies: `Footer`, `Contato` e `LojaFisica` devem usar `getPublicStoreSettings`, `formatStoreWhatsApp` quando exibirem o texto e `buildWhatsAppUrl` para links. O teste deve mockar `getPublicStoreSettings` com `"5585921002688"` e esperar `(85) 92100-2688` e `https://wa.me/5585921002688`.

- [ ] **Step 2: Executar os testes para confirmar a falha**

Run: `npm test -- tests/store-settings.test.ts`

Expected: FAIL porque `/contato` e `/loja` são síncronos e possuem valores fixos; o rodapé ainda mostra o texto literal antigo.

- [ ] **Step 3: Conectar as páginas às configurações públicas**

Em cada arquivo, importar os helpers:

```ts
import { formatStoreWhatsApp, getPublicStoreSettings } from "@/lib/store-settings"
import { buildWhatsAppUrl } from "@/lib/whatsapp"
```

Converter `Contato` e `LojaFisica` para `async function` e obter a configuração no início:

```ts
const settings = await getPublicStoreSettings()
```

Substituir os literais pelos consumidores dinâmicos:

```tsx
<span>{formatStoreWhatsApp(settings.whatsapp)}</span>
<a href={buildWhatsAppUrl(settings.whatsapp, "Olá! Quero falar com a equipe da Brabus.")}>...</a>
<p className="text-gray-400">WhatsApp: {formatStoreWhatsApp(settings.whatsapp)}</p>
```

Manter as mensagens contextuais dos componentes já dinâmicos inalteradas. Não alterar links de endereço, e-mail ou Instagram.

- [ ] **Step 4: Executar os testes para confirmar o sucesso**

Run: `npm test -- tests/store-settings.test.ts tests/add-to-cart-navigation.test.ts`

Expected: PASS, incluindo o fluxo de produto que continua usando a configuração fornecida como entrada.

- [ ] **Step 5: Commitar a etapa**

```bash
git add components/Footer.tsx app/contato/page.tsx app/loja/page.tsx tests/store-settings.test.ts
```

### Task 3: Atualizar defaults e dados existentes com segurança

**Files:**
- Modify: `prisma/schema.prisma:329`
- Modify: `prisma/seed.ts:439-450`
- Create: `prisma/migrations/20260921120000_update_store_settings_whatsapp/migration.sql`

- [ ] **Step 1: Escrever o teste de migration que falha**

Adicionar um teste de integração em `tests/store-settings.test.ts` que, em banco isolado, cria três registros de `store_settings`: um com `5585997839040`, um com `85997839040` e outro com `5585111112222`. Após aplicar a migration, esperar `5585921002688` nos dois legados e a preservação do personalizado. Criar um registro sem `whatsapp` e esperar o default `5585921002688`.

- [ ] **Step 2: Executar o teste para confirmar a falha**

Run: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brabus_store_test" npm test -- tests/store-settings.test.ts`

Expected: FAIL porque o default e os valores existentes ainda são antigos.

- [ ] **Step 3: Atualizar schema, seed e criar migration aditiva**

Em `prisma/schema.prisma` e `prisma/seed.ts`, usar `"5585921002688"`.

Criar `prisma/migrations/20260921120000_update_store_settings_whatsapp/migration.sql`:

```sql
ALTER TABLE "store_settings"
ALTER COLUMN "whatsapp" SET DEFAULT '5585921002688';

UPDATE "store_settings"
SET "whatsapp" = '5585921002688'
WHERE regexp_replace("whatsapp", '[^0-9]', '', 'g') IN ('5585997839040', '85997839040');
```

Não alterar `prisma/migrations/20260317091947_init/migration.sql`, pois ela é histórica.

- [ ] **Step 4: Aplicar a migration e executar o teste de integração**

Run: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brabus_store_test" npx prisma migrate deploy && DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brabus_store_test" npm test -- tests/store-settings.test.ts`

Expected: PASS; apenas os dois formatos do número legado são convertidos e o default novo é aplicado.

- [ ] **Step 5: Commitar a etapa**

```bash
git add prisma/schema.prisma prisma/seed.ts prisma/migrations/20260921120000_update_store_settings_whatsapp/migration.sql tests/store-settings.test.ts
```

### Task 4: Atualizar documentação atual e validar a entrega

**Files:**
- Modify: `docs/PRD.md:47,112-116,494-501,744,813`
- Modify: `docs/prompt-ecommerce-v2.md:67,194`

- [ ] **Step 1: Substituir somente as referências de contato atual**

Trocar `(85) 99783-9040` por `(85) 92100-2688` e `5585997839040` por `5585921002688` nos trechos que descrevem o comportamento atual. Não alterar documentos de planejamento histórico nem migrations antigas.

- [ ] **Step 2: Buscar referências ativas ao número antigo**

Run: `rg -n "99783[[:space:].-]?9040|5585997839040|85997839040" app components lib prisma/schema.prisma prisma/seed.ts tests docs/PRD.md docs/prompt-ecommerce-v2.md`

Expected: nenhum resultado; a migration nova e documentos históricos estão fora do escopo desta busca.

- [ ] **Step 3: Executar verificações automatizadas**

Run: `npm test && npm run lint -- . && npm run build`

Expected: todos os comandos terminam com código 0.

- [ ] **Step 4: Verificar manualmente sem enviar mensagens**

Abrir `/`, `/products/<slug>`, `/contato` e `/loja`; confirmar textos `(85) 92100-2688` e que os links de WhatsApp apontam para `wa.me/5585921002688`. Em `/admin/settings`, salvar um número de teste e confirmar que rodapé, contato, loja e CTAs dinâmicos refletem esse valor. Restaurar o número novo antes de encerrar.

- [ ] **Step 5: Commitar a etapa**

```bash
git add docs/PRD.md docs/prompt-ecommerce-v2.md
```

## Revisão do plano

- Cobertura da spec: Tasks 1 e 2 centralizam e exibem o novo número; Task 3 atualiza defaults e migra apenas valores legados; Task 4 atualiza documentação e valida todos os critérios.
- Placeholders: não há `TODO`, `TBD` ou etapas sem caminho, arquivo ou comando de verificação.
- Consistência: `DEFAULT_STORE_WHATSAPP`, `formatStoreWhatsApp`, `getPublicStoreSettings` e `buildWhatsAppUrl` são os únicos contratos introduzidos e são usados com os mesmos nomes em todas as tarefas.
