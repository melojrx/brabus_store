# Máscara monetária no recebimento de títulos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o valor de um recebimento de título seja digitado e exibido na máscara de reais já adotada pelo sistema.

**Architecture:** A tela de detalhes do cliente reutilizará as funções puras existentes de moeda. A interface guardará a string mascarada; no envio, ela a converterá para número decimal, mantendo a API e suas regras financeiras inalteradas.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner.

## Global Constraints

- Executar diretamente na branch `main`, sem worktree separado.
- Reutilizar `maskCurrencyInput` e `parseCurrencyInputValue` de `lib/currency-input.ts`.
- Não alterar schema, endpoints ou regras de distribuição FIFO, saldo, idempotência e estorno.
- Manter a validação do servidor como fonte de verdade.

---

### Task 1: Aplicar máscara no formulário de recebimento

**Files:**
- Modify: `app/admin/customers/[id]/CustomerDetailClient.tsx`
- Test: `tests/currency-input.test.ts`

**Interfaces:**
- Consumes: `maskCurrencyInput(value: string): string` e `parseCurrencyInputValue(value: string): number | null` de `lib/currency-input.ts`.
- Produces: corpo do `POST /api/admin/customers/:id/titles/payments` com `amount` numérico ou `null` quando o campo estiver vazio.

- [x] **Step 1: Escrever o teste que descreve a conversão da entrada mascarada**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { maskCurrencyInput, parseCurrencyInputValue } from "../lib/currency-input"

test("formats and parses a title receipt amount in reais", () => {
  const value = maskCurrencyInput("1234")

  assert.equal(value, "R$ 12,34")
  assert.equal(parseCurrencyInputValue(value), 12.34)
})
```

- [x] **Step 2: Executar o teste para verificar o estado inicial**

Run: `node --import tsx --test tests/currency-input.test.ts`

Expected: FAIL porque o arquivo de teste ainda não existe.

- [x] **Step 3: Conectar o campo da tela ao padrão compartilhado**

```tsx
import { maskCurrencyInput, parseCurrencyInputValue } from "@/lib/currency-input"

const parsedAmount = parseCurrencyInputValue(amount)

body: JSON.stringify({ amount: parsedAmount, paymentMethod: method, idempotencyKey: crypto.randomUUID() })

<input
  inputMode="numeric"
  placeholder="R$ 0,00"
  value={amount}
  onChange={(event) => setAmount(maskCurrencyInput(event.target.value))}
/>
```

- [x] **Step 4: Executar o teste específico e a suíte completa**

Run: `node --import tsx --test tests/currency-input.test.ts && npm test`

Expected: PASS, incluindo a conversão de `R$ 12,34` para `12.34`.

- [x] **Step 5: Validar tipagem, lint e build**

Run: `npm run lint -- . && npm run build && git diff --check`

Expected: build aprovado e nenhuma falha de lint introduzida.

- [x] **Step 6: Registrar a alteração**

```bash
git add app/admin/customers/[id]/CustomerDetailClient.tsx tests/currency-input.test.ts docs/superpowers/plans/2026-09-06-title-receipt-currency-mask.md
git commit -m "feat: mask title receipt amounts"
```
