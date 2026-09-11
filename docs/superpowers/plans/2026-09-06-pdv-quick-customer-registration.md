# Cadastro Rapido de Cliente no PDV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir cadastrar e selecionar um Customer usando os dados manuais ja preenchidos no PDV, sem perder a venda em andamento.

**Architecture:** O cliente rapido reutiliza `POST /api/admin/customers`, que continua sendo a unica fronteira de persistencia de Customer. `PdvManager` monta o payload minimo, seleciona o Customer serializado devolvido e limpa somente os tres campos manuais; itens, entrega e pagamento nao sao alterados.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, API Route Handler e Node test runner com tsx.

## Global Constraints

- Trabalhar no checkout atual na branch `codex/fiado-titulos`; nao criar worktree separado.
- Nome e telefone sao obrigatorios no cadastro rapido; e-mail e opcional.
- Reutilizar `POST /api/admin/customers`; nao criar rota, User, pedido ou titulo adicional.
- Venda comum continua permitindo dados manuais sem cadastro.
- Cadastro rapido seleciona o Customer criado e preserva itens, entrega, desconto e pagamento atuais.
- Para Fiado, a elegibilidade continua validada no servidor ao concluir a venda.
- Validar com `npm test`, `npm run lint -- .` e `npm run build`.

---

## File Structure

| Caminho | Responsabilidade |
|---|---|
| `app/admin/pdv/PdvManager.tsx` | Exibe a acao, envia o cadastro rapido, seleciona o Customer retornado e preserva a venda. |
| `tests/pdv-quick-customer.test.ts` | Contrato puro do payload minimo e regras de disponibilidade da acao. |
| `lib/pdv.ts` | Exporta normalizacao e validacao reutilizavel do payload rapido. |

## Shared Interfaces

Adicionar em `lib/pdv.ts`:

    export type QuickPdvCustomerInput = {
      name: string
      phone: string
      email: string | null
    }

    export function buildQuickPdvCustomerInput(input: {
      name: string
      phone: string
      email: string
    }): QuickPdvCustomerInput

A funcao deve remover espacos externos, transformar e-mail vazio em `null` e falhar com `Error("Informe nome e telefone para cadastrar o cliente.")` quando nome ou telefone ficarem vazios.

### Task 1: Contrato do cadastro rapido

**Files:**
- Modify: `lib/pdv.ts:1-190`
- Create: `tests/pdv-quick-customer.test.ts`

**Interfaces:**
- Produces: `buildQuickPdvCustomerInput()` para o componente do PDV.

- [ ] **Step 1: Escrever o teste que falha**

    import assert from "node:assert/strict"
    import test from "node:test"
    import { buildQuickPdvCustomerInput } from "../lib/pdv"

    test("builds the minimum customer payload from PDV fields", () => {
      assert.deepEqual(buildQuickPdvCustomerInput({
        name: " Ana ", phone: " (85) 99999-0000 ", email: " ",
      }), { name: "Ana", phone: "(85) 99999-0000", email: null })
    })

    test("requires name and phone for quick registration", () => {
      assert.throws(() => buildQuickPdvCustomerInput({ name: "Ana", phone: "", email: "" }), /nome e telefone/i)
    })

- [ ] **Step 2: Confirmar a falha inicial**

Run: `node --import tsx --test tests/pdv-quick-customer.test.ts`

Expected: falha porque `buildQuickPdvCustomerInput` ainda nao existe.

- [ ] **Step 3: Implementar o contrato minimo**

    export function buildQuickPdvCustomerInput(input: {
      name: string
      phone: string
      email: string
    }): QuickPdvCustomerInput {
      const name = input.name.trim()
      const phone = input.phone.trim()
      const email = input.email.trim() || null

      if (!name || !phone) {
        throw new Error("Informe nome e telefone para cadastrar o cliente.")
      }

      return { name, phone, email }
    }

- [ ] **Step 4: Verificar o contrato**

Run: `node --import tsx --test tests/pdv-quick-customer.test.ts`

Expected: dois testes passam.

### Task 2: Acao no PDV e preservacao da venda

**Files:**
- Modify: `app/admin/pdv/PdvManager.tsx:65-560,900-1080`
- Test: `tests/pdv-quick-customer.test.ts`

**Interfaces:**
- Consumes: `buildQuickPdvCustomerInput()` e `POST /api/admin/customers`.
- Produces: Customer mestre selecionado sem resetar a venda.

- [ ] **Step 1: Escrever a regra de disponibilidade que falha**

    test("allows quick registration only when no customer is selected and name and phone exist", () => {
      assert.equal(canQuickRegisterPdvCustomer({ selectedCustomerId: null, name: "Ana", phone: "85999990000" }), true)
      assert.equal(canQuickRegisterPdvCustomer({ selectedCustomerId: "customer-1", name: "Ana", phone: "85999990000" }), false)
    })

- [ ] **Step 2: Confirmar a falha inicial**

Run: `node --import tsx --test tests/pdv-quick-customer.test.ts`

Expected: falha porque `canQuickRegisterPdvCustomer` ainda nao foi exportada.

- [ ] **Step 3: Implementar a acao**

Adicionar `canQuickRegisterPdvCustomer()` em `lib/pdv.ts`. Em `PdvManager`, quando a regra retornar `true`, mostrar o botao `Cadastrar e selecionar cliente` abaixo dos campos manuais. Ao clicar:

    const input = buildQuickPdvCustomerInput({
      name: walkInCustomerName,
      phone: walkInCustomerPhone,
      email: walkInCustomerEmail,
    })
    const response = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })

Em resposta `201`, chamar `handleSelectCustomer(response.data)`. Em erro, usar `parseErrorMessage(response)` e nao limpar campos, itens, entrega, desconto ou pagamento. Desabilitar o botao enquanto a requisicao estiver pendente.

- [ ] **Step 4: Verificar a regressao de PDV**

Run: `node --import tsx --test tests/pdv-quick-customer.test.ts tests/pdv-fiado.test.ts tests/delivery-policy.test.ts`

Expected: cadastro rapido, Fiado, retirada e entrega passam.

- [ ] **Step 5: Validar projeto e commitar**

Run: `npm test && npm run lint -- . && npm run build`

Expected: testes passam, lint nao tem erros e build conclui.

    git add lib/pdv.ts app/admin/pdv/PdvManager.tsx tests/pdv-quick-customer.test.ts
    git commit -m "feat: register customers from pdv"

## Plan Self-Review

- Cobertura: o plano trata dados minimos, acao no PDV, selecao do Customer retornado, preservacao da venda e erros.
- Escopo: nao cria rota, User, pedido ou titulo adicional.
- Consistencia: os mesmos nomes `QuickPdvCustomerInput`, `buildQuickPdvCustomerInput` e `canQuickRegisterPdvCustomer` sao usados em todas as tarefas.
