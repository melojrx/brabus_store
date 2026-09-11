# Venda Fiado e Titulos por Cliente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Permitir venda fiado no PDV para cliente cadastrado, com baixa de estoque na venda, titulos por cliente, recebimento parcial ou total FIFO, auditoria e consulta operacional.

**Architecture:** Pedido permanece como registro comercial e de estoque. CustomerReceivable, CustomerPayment e CustomerPaymentAllocation formam o dominio financeiro auditavel. Order passa a referenciar opcionalmente Customer e User, permitindo venda presencial sem login e preservando checkout online. O detalhe do cliente concentra a aba Titulos e Pedidos torna-se a consulta transversal.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Prisma 5, PostgreSQL 16, Zod 4, Node test runner com tsx.

## Global Constraints

- Trabalhar no checkout atual, na branch codex/fiado-titulos, derivada de main; nao criar worktree separado.
- Fiado existe somente no PDV; nunca no checkout publico.
- Fiado exige Customer ativo selecionado, com nome e telefone. CPF, email, endereco e User sao opcionais.
- Nao implementar limite de credito, vencimento, juros, multa, correcao, credito a favor ou fiado online.
- Baixar estoque na mesma transacao da venda fiado; recebimento e quitacao nunca alteram estoque.
- Alocar recebimentos FIFO nos titulos abertos mais antigos; rejeitar valor acima do saldo aberto.
- ADMIN e SELLER vendem fiado e registram recebimentos. Somente ADMIN bloqueia/desbloqueia credito e estorna recebimento.
- Registros financeiros nao sao editados ou excluidos; correcao ocorre por estorno rastreavel.
- Usar 2 espacos, ponto e virgula ausente, imports com aspas duplas e alias @/.
- Todo incremento deve passar por npm test, npm run lint -- . e npm run build antes de integracao.

---

## File Structure

| Caminho | Responsabilidade |
|---|---|
| prisma/schema.prisma | Relações pedido/cliente e modelos de titulos, recebimentos, alocacoes e eventos. |
| prisma/migrations/20260906120000_add_customer_credit_titles/migration.sql | Evolucao PostgreSQL nao destrutiva e indices de consulta FIFO. |
| lib/customer-credit.ts | Elegibilidade, transacoes de titulo, recebimento, estorno, bloqueio e serializacao. |
| lib/manual-orders.ts | Cria venda PDV fiado, baixa estoque e cria titulo na mesma transacao. |
| lib/pdv.ts | Contrato Zod do PDV para Fiado. |
| app/api/admin/pdv/orders/route.ts | Resolve Customer mestre e venda sem cliente para modalidades nao fiado. |
| app/api/admin/customers/[id]/titles/* | Consulta, recebimento e estorno de titulos. |
| app/api/admin/customers/[id]/credit-block/route.ts | Bloqueio administrativo de novas vendas fiado. |
| app/admin/customers/[id]/* | Abas Cadastro e Titulos. |
| lib/admin-orders.ts e app/admin/orders/page.tsx | Filtros server-side de Pedidos e saldo de titulo. |
| lib/admin-dashboard.ts e app/admin/page.tsx | Separacao entre venda comercial e receita recebida. |
| tests/customer-credit.test.ts | Credito, FIFO, excesso, idempotencia, estorno e bloqueio. |
| tests/pdv-fiado.test.ts | Contrato e baixa de estoque da venda fiado. |
| tests/admin-orders.test.ts | Filtros e serializacao de pedidos sem User. |
| tests/admin-dashboard.test.ts | Venda comercial separada da receita de recebimento. |

## Shared Interfaces

Criar estes contratos em lib/customer-credit.ts antes dos consumidores:

    export type CustomerCreditEligibility = {
      id: string
      name: string
      phone: string | null
      active: boolean
      creditBlocked: boolean
    }

    export type RegisterCustomerPaymentInput = {
      customerId: string
      amount: number
      paymentMethod: "CASH" | "MANUAL_PIX" | "POS_DEBIT" | "POS_CREDIT"
      reference?: string | null
      notes?: string | null
      actorUserId: string
      idempotencyKey: string
    }

    export type CustomerPaymentResult = {
      paymentId: string
      customerId: string
      amount: number
      allocations: Array<{
        receivableId: string
        orderId: string
        orderNumber: string | null
        amount: number
        openAmount: number
        status: "OPEN" | "PARTIAL" | "SETTLED"
      }>
    }

    export function assertFiadoCustomerEligible(customer: CustomerCreditEligibility): void
    export async function registerCustomerPayment(
      prisma: PrismaClient,
      input: RegisterCustomerPaymentInput,
    ): Promise<CustomerPaymentResult>

    export async function reverseCustomerPayment(
      prisma: PrismaClient,
      input: { customerId: string; paymentId: string; actorUserId: string; reason: string },
    ): Promise<void>

    export async function setCustomerCreditBlocked(
      prisma: PrismaClient,
      input: { customerId: string; blocked: boolean; reason?: string | null; actorUserId: string },
    ): Promise<void>

Alterar createManualOrder() para receber customerId opcional e userId opcional. Quando paymentMethod for FIADO, customerId e obrigatorio e o titulo nasce dentro da mesma transacao do pedido.

### Task 1: Persistencia e contratos de credito

**Files:**
- Modify: prisma/schema.prisma:22-55,163-225,341-369
- Create: prisma/migrations/20260906120000_add_customer_credit_titles/migration.sql
- Modify: lib/payment-status.ts:1-72
- Create: lib/customer-credit.ts
- Test: tests/customer-credit.test.ts

**Interfaces:**
- Consumes: enums e relacoes atuais de Order, Customer, PaymentMethod e PaymentStatus.
- Produces: FIADO, CustomerReceivableStatus, CustomerCreditEventType, modelos financeiros e assertFiadoCustomerEligible.

- [ ] **Step 1: Escrever os testes de elegibilidade**

    import assert from "node:assert/strict"
    import test from "node:test"
    import { assertFiadoCustomerEligible } from "../lib/customer-credit"

    test("accepts an active customer with name and phone for fiado", () => {
      assert.doesNotThrow(() => assertFiadoCustomerEligible({
        id: "customer-1", name: "Ana", phone: "85999990000", active: true, creditBlocked: false,
      }))
    })

    test("rejects fiado for missing phone and blocked credit", () => {
      assert.throws(() => assertFiadoCustomerEligible({
        id: "customer-1", name: "Ana", phone: null, active: true, creditBlocked: false,
      }), /telefone/i)
      assert.throws(() => assertFiadoCustomerEligible({
        id: "customer-1", name: "Ana", phone: "85999990000", active: true, creditBlocked: true,
      }), /bloqueado/i)
    })

- [ ] **Step 2: Executar o teste para confirmar a falha inicial**

Run: node --import tsx --test tests/customer-credit.test.ts
Expected: falha de importacao porque lib/customer-credit.ts ainda nao existe.

- [ ] **Step 3: Criar a migration e o schema nao destrutivo**

Adicionar FIADO a PaymentMethod, os enums CustomerReceivableStatus (OPEN, PARTIAL, SETTLED, CANCELLED) e CustomerCreditEventType (RECEIVABLE_CREATED, RECEIVABLE_CANCELLED, PAYMENT_RECORDED, PAYMENT_REVERSED, CREDIT_BLOCKED, CREDIT_UNBLOCKED).

Adicionar CustomerReceivable com orderId unico, customerId, originalAmount, openAmount, status, settledAt, cancelledAt e indice customerId/status/createdAt. Adicionar CustomerPayment com customerId, amount, paymentMethod, reference, notes, receivedAt, receivedByUserId, idempotencyKey unico, reversedAt, reversedByUserId e reversalReason. Adicionar CustomerPaymentAllocation com paymentId, receivableId, amount, indice por receivableId e unique paymentId/receivableId. Adicionar CustomerCreditEvent com customerId, actorUserId, tipo, valor, referencias, motivo e timestamp.

No Order, tornar userId e user opcionais, adicionar customerId, customer e receivable. No Customer, adicionar creditBlocked, creditBlockedReason, creditBlockedAt, creditBlockedByUserId e as relacoes novas.

Run: npx prisma migrate dev --name add_customer_credit_titles
Expected: migration criada sem remover dados de orders.userId existentes.

- [ ] **Step 4: Implementar elegibilidade e labels**

Criar lib/customer-credit.ts com esta regra:

    export function assertFiadoCustomerEligible(customer: CustomerCreditEligibility) {
      if (!customer.active) throw new Error("O cliente está inativo.")
      if (!customer.name.trim()) throw new Error("O cliente precisa ter nome cadastrado.")
      if (!customer.phone?.trim()) throw new Error("O cliente precisa ter telefone cadastrado.")
      if (customer.creditBlocked) throw new Error("O fiado está bloqueado para este cliente.")
    }

Adicionar FIADO a PAYMENT_METHOD_VALUES e PAYMENT_METHOD_LABELS. Nao adicionar FIADO a PUBLIC_CHECKOUT_PAYMENT_METHOD_VALUES.

- [ ] **Step 5: Verificar schema e testes**

Run: npm run prisma:generate && node --import tsx --test tests/customer-credit.test.ts
Expected: Prisma Client e testes de elegibilidade passam.

- [ ] **Step 6: Commitar o incremento**

    git add prisma/schema.prisma prisma/migrations lib/customer-credit.ts lib/payment-status.ts tests/customer-credit.test.ts
    git commit -m "feat: add customer credit persistence"

### Task 2: Recebimento FIFO, idempotencia, estorno e bloqueio

**Files:**
- Modify: lib/customer-credit.ts
- Test: tests/customer-credit.test.ts

**Interfaces:**
- Consumes: modelos da Task 1.
- Produces: registerCustomerPayment, reverseCustomerPayment, setCustomerCreditBlocked e serializadores de titulo.

- [ ] **Step 1: Escrever os testes financeiros**

    test("allocates a payment to oldest receivables in FIFO order", async () => {
      const result = await registerCustomerPayment(prisma as never, {
        customerId: "customer-1", amount: 25, paymentMethod: "CASH",
        actorUserId: "seller-1", idempotencyKey: "payment-1",
      })
      assert.deepEqual(result.allocations.map((item) => [item.orderId, item.amount, item.openAmount]), [
        ["order-1", 10, 0], ["order-2", 15, 5],
      ])
    })

    test("rejects receipt higher than open balance", async () => {
      await assert.rejects(() => registerCustomerPayment(prisma as never, {
        customerId: "customer-1", amount: 31, paymentMethod: "CASH",
        actorUserId: "seller-1", idempotencyKey: "payment-overflow",
      }), /maior que o saldo/i)
    })

    test("reverses allocations without deleting original receipt", async () => {
      await reverseCustomerPayment(prisma as never, {
        customerId: "customer-1", paymentId: "payment-1", actorUserId: "admin-1",
        reason: "Valor digitado incorretamente",
      })
      assert.equal(payment.reversedAt instanceof Date, true)
      assert.equal(receivableOne.openAmount, 10)
      assert.equal(receivableTwo.openAmount, 20)
    })

- [ ] **Step 2: Executar os testes para confirmar a falha inicial**

Run: node --import tsx --test tests/customer-credit.test.ts
Expected: falha porque os servicos ainda nao foram exportados.

- [ ] **Step 3: Implementar recebimento transacional**

Em registerCustomerPayment(), buscar idempotencyKey antes de criar um novo registro; para a mesma chave e cliente, retornar a serializacao persistida sem nova alocacao. Validar valor positivo e aceitar somente CASH, MANUAL_PIX, POS_DEBIT e POS_CREDIT. Exigir referencia para MANUAL_PIX.

Dentro de prisma.$transaction, buscar titulos OPEN/PARTIAL com saldo positivo, ordenados por createdAt ASC e id ASC; rejeitar valor maior que a soma; criar CustomerPayment, criar alocacoes, reduzir openAmount e atualizar status. Quando openAmount chegar a zero, atualizar somente paymentStatus para PAID e paidAt do pedido; manter status DELIVERED.

    let remaining = normalizeMoney(input.amount)
    for (const receivable of receivables) {
      if (remaining === 0) break
      const amount = Math.min(remaining, receivable.openAmount.toNumber())
      const openAmount = roundMoney(receivable.openAmount.toNumber() - amount)
      await tx.customerPaymentAllocation.create({ data: {
        paymentId: payment.id, receivableId: receivable.id, amount,
      } })
      await tx.customerReceivable.update({ where: { id: receivable.id }, data: {
        openAmount, status: openAmount === 0 ? "SETTLED" : "PARTIAL",
        settledAt: openAmount === 0 ? new Date() : null,
      } })
      remaining = roundMoney(remaining - amount)
    }

- [ ] **Step 4: Implementar estorno e bloqueio**

Estorno impede segundo estorno, restaura cada openAmount das alocacoes, reabre titulos, atualiza pedido associado para PENDING com paidAt nulo, marca pagamento com dados de estorno e cria PAYMENT_REVERSED. Nunca deletar pagamento nem alocacoes.

Bloqueio exige motivo quando blocked for true, atualiza campos do Customer e cria CREDIT_BLOCKED ou CREDIT_UNBLOCKED.

- [ ] **Step 5: Executar a cobertura financeira**

Run: node --import tsx --test tests/customer-credit.test.ts
Expected: passam elegibilidade, FIFO, parcial, excesso, idempotencia, estorno e bloqueio.

- [ ] **Step 6: Commitar os servicos**

    git add lib/customer-credit.ts tests/customer-credit.test.ts
    git commit -m "feat: add customer title payments"

### Task 3: Venda Fiado no PDV com estoque imediato

**Files:**
- Modify: lib/pdv.ts:6-180
- Modify: lib/manual-orders.ts:30-390
- Modify: app/api/admin/pdv/orders/route.ts:14-93
- Modify: app/admin/pdv/PdvManager.tsx:140-560,1180-1540
- Test: tests/pdv-fiado.test.ts
- Test: tests/delivery-policy.test.ts

**Interfaces:**
- Consumes: assertFiadoCustomerEligible e modelos financeiros.
- Produces: pedido PDV DELIVERED, titulo OPEN e decremento de estoque no mesmo transaction.

- [ ] **Step 1: Escrever os testes de contrato e venda**

    test("requires registered customer for fiado PDV payload", () => {
      const result = createPdvOrderSchema.safeParse({
        ...validPdvPayload, paymentMethod: "FIADO", paymentStatus: "PENDING", customerId: null,
      })
      assert.equal(result.success, false)
    })

    test("creates delivered fiado order, title and stock decrement together", async () => {
      await createManualOrder(prisma as never, {
        userId: null, customerId: "customer-1", channel: OrderChannel.PDV,
        items: [{ productId: "product-1", productVariantId: "variant-1", quantity: 1 }],
        shippingType: "PICKUP", address: {}, paymentMethod: "FIADO", paymentStatus: "PENDING",
      })
      assert.equal(persistedOrder.status, "DELIVERED")
      assert.equal(persistedOrder.paymentStatus, "PENDING")
      assert.equal(stockDecrements, 1)
      assert.equal(createdReceivable.openAmount, 10)
    })

- [ ] **Step 2: Executar os testes para confirmar a falha inicial**

Run: node --import tsx --test tests/pdv-fiado.test.ts
Expected: falha porque FIADO ainda nao pertence ao schema e a venda nao cria titulo.

- [ ] **Step 3: Alterar schema Zod e createManualOrder**

Adicionar FIADO a PDV_PAYMENT_METHOD_VALUES. Para FIADO, exigir customerId, forcar paymentStatus PENDING e rejeitar dinheiro, referencia Pix e parcelamento.

Alterar ManualOrderCreateInput:

    userId?: string | null
    customerId?: string | null
    paymentMethod: "CASH" | "MANUAL_PIX" | "POS_DEBIT" | "POS_CREDIT" | "FIADO"

Carregar Customer antes da transacao e validar elegibilidade. Dentro do transaction:

    const isFiado = input.paymentMethod === PaymentMethod.FIADO
    const shouldDecrementStock = input.paymentStatus === PaymentStatus.PAID || isFiado
    const orderStatus = isFiado
      ? OrderStatus.DELIVERED
      : input.paymentStatus === PaymentStatus.PAID ? OrderStatus.PAID : OrderStatus.PENDING

Criar CustomerReceivable e evento RECEIVABLE_CREATED imediatamente depois de criar o pedido fiado. Nunca chamar dispatchOrderPaid para Fiado no ato da venda.

- [ ] **Step 4: Corrigir resolucao de cliente na rota PDV**

Trocar a busca atual por Customer mestre quando payload.customerId existir. Passar customerId, customer.userId ou null e snapshots do Customer a createManualOrder. Manter ensurePdvWalkInCustomer apenas para venda nao fiado sem cliente selecionado.

- [ ] **Step 5: Atualizar a interface PDV**

Adicionar Fiado ao select. Ao escolher Fiado, limpar dinheiro, referencia e parcelamento, fixar status PENDING, ocultar campos de pagamento imediato e desabilitar conclusao sem selectedCustomer elegivel. Mostrar motivo quando o cliente estiver bloqueado, inativo ou sem nome/telefone. A rota permanece a autoridade final.

- [ ] **Step 6: Executar regressao de venda**

Run: node --import tsx --test tests/pdv-fiado.test.ts tests/delivery-policy.test.ts tests/order-discount.test.ts
Expected: passam Fiado, retirada, Entrega Braba, desconto e meios PDV existentes.

- [ ] **Step 7: Commitar a integracao**

    git add lib/pdv.ts lib/manual-orders.ts app/api/admin/pdv/orders/route.ts app/admin/pdv/PdvManager.tsx tests/pdv-fiado.test.ts tests/delivery-policy.test.ts
    git commit -m "feat: sell fiado through pdv"

### Task 4: Rotas de Titulos e cancelamento seguro

**Files:**
- Create: app/api/admin/customers/[id]/titles/route.ts
- Create: app/api/admin/customers/[id]/titles/payments/route.ts
- Create: app/api/admin/customers/[id]/titles/payments/[paymentId]/reverse/route.ts
- Create: app/api/admin/customers/[id]/credit-block/route.ts
- Modify: app/api/admin/orders/[id]/cancel/route.ts:1-140
- Test: tests/customer-credit.test.ts

**Interfaces:**
- Consumes: servicos financeiros da Task 2.
- Produces: GET de titulos, POST de recebimento, POST de estorno, PATCH de bloqueio e cancelamento protegido.

- [ ] **Step 1: Escrever testes de autorizacao e schema**

    test("accepts staff receipt and rejects FIADO as receipt method", async () => {
      assert.equal((await postPayment({ amount: "10.00", paymentMethod: "CASH", idempotencyKey: "request-1" })).status, 201)
      assert.equal((await postPayment({ amount: "10.00", paymentMethod: "FIADO", idempotencyKey: "request-2" })).status, 400)
    })

    test("allows only ADMIN to block credit or reverse receipt", async () => {
      assert.equal((await reverseAs("SELLER")).status, 403)
      assert.equal((await blockAs("SELLER")).status, 403)
      assert.equal((await reverseAs("ADMIN")).status, 200)
    })

- [ ] **Step 2: Executar os testes para confirmar a falha inicial**

Run: node --import tsx --test tests/customer-credit.test.ts
Expected: falha porque os handlers ainda nao existem.

- [ ] **Step 3: Criar handlers com Zod e autorizacao**

Usar auth() em toda rota. Retornar 401 sem equipe e 403 para SELLER em bloqueio/estorno. Rejeitar 404 quando cliente/pagamento nao pertence ao id da rota.

    const paymentSchema = z.object({
      amount: z.coerce.number().positive().finite(),
      paymentMethod: z.enum(["CASH", "MANUAL_PIX", "POS_DEBIT", "POS_CREDIT"]),
      reference: z.string().trim().max(120).nullable().optional(),
      notes: z.string().trim().max(1000).nullable().optional(),
      idempotencyKey: z.string().uuid(),
    })

GET titles retorna cliente, openBalance, receivables, payments e alocacoes serializados. POST payments chama registerCustomerPayment. POST reverse exige motivo entre 3 e 1000 caracteres. PATCH credit-block exige motivo nao vazio quando bloquear.

- [ ] **Step 4: Proteger cancelamento de venda fiado**

Incluir receivable e allocations na busca do pedido. Se houver alocacao de pagamento nao estornado, retornar 400 com: "Estorne os recebimentos deste título antes de cancelar a venda fiado." Se titulo estiver aberto sem recebimento, na mesma transacao devolver estoque uma vez, cancelar pedido, marcar titulo CANCELLED/openAmount 0/cancelledAt e criar RECEIVABLE_CANCELLED.

- [ ] **Step 5: Executar cobertura financeira**

Run: node --import tsx --test tests/customer-credit.test.ts
Expected: passam autorizacao, payload, estorno, idempotencia e cancelamento protegido.

- [ ] **Step 6: Commitar as rotas**

    git add app/api/admin/customers app/api/admin/orders/[id]/cancel/route.ts tests/customer-credit.test.ts
    git commit -m "feat: add customer title APIs"

### Task 5: Detalhe do cliente e aba Titulos

**Files:**
- Create: app/admin/customers/[id]/page.tsx
- Create: app/admin/customers/[id]/CustomerDetailClient.tsx
- Modify: app/admin/customers/CustomersManager.tsx:1-470
- Test: tests/customer-credit.test.ts

**Interfaces:**
- Consumes: APIs da Task 4.
- Produces: detalhe com abas Cadastro e Titulos, sem menu global de Fiado.

- [ ] **Step 1: Escrever teste de serializacao de titulo**

    test("serializes original, paid and open title amounts", () => {
      const title = serializeCustomerReceivable({
        originalAmount: decimal(30), openAmount: decimal(12), status: "PARTIAL",
      })
      assert.deepEqual(title, {
        originalAmount: 30, paidAmount: 18, openAmount: 12, status: "PARTIAL",
      })
    })

- [ ] **Step 2: Executar o teste para confirmar a falha inicial**

Run: node --import tsx --test tests/customer-credit.test.ts
Expected: falha porque serializeCustomerReceivable ainda nao existe.

- [ ] **Step 3: Criar detalhe e interface**

Em page.tsx, exigir isStaffRole, carregar Customer por id e chamar notFound quando ausente. Em CustomerDetailClient usar activeTab igual a cadastro ou titulos. Cadastro mostra dados atuais e bloqueio apenas a ADMIN. Titulos mostra saldo aberto, compras, itens/snapshots, original, pago, saldo, situacao, historico, alocacoes e recebimento.

    <p>Saldo em aberto: {formatCurrency(titles.openBalance)}</p>
    <table aria-label="Compras fiado">...</table>
    <form aria-label="Registrar recebimento">...</form>
    <table aria-label="Histórico de recebimentos">...</table>

Gerar crypto.randomUUID no submit, enviar idempotencyKey e reutilizar a chave enquanto pendente. Apos sucesso, recarregar GET titles e exibir as alocacoes retornadas. Estorno pede confirmacao e motivo.

- [ ] **Step 4: Ligar a listagem ao detalhe**

Adicionar Link acessivel "Abrir detalhes de <nome>" em CustomersManager para /admin/customers/<id>. Preservar editar/desativar. Nao adicionar item de menu chamado Fiado ou Titulos.

- [ ] **Step 5: Verificar rota e tipos**

Run: node --import tsx --test tests/customer-credit.test.ts && npm run build
Expected: serializacao passa e build reconhece a rota dinamica.

- [ ] **Step 6: Commitar o detalhe**

    git add app/admin/customers tests/customer-credit.test.ts
    git commit -m "feat: show customer titles"

### Task 6: Consulta de Pedidos por filtros

**Files:**
- Modify: lib/admin-orders.ts:1-360
- Modify: app/admin/orders/page.tsx:1-300
- Test: tests/admin-orders.test.ts

**Interfaces:**
- Consumes: Order.user opcional, Order.customer e Order.receivable.
- Produces: filtros em URL e serializacao segura para pedidos sem User.

- [ ] **Step 1: Escrever testes de filtro e fallback de cliente**

    test("parses order filters from URL", () => {
      assert.deepEqual(parseAdminOrdersQuery(new URLSearchParams(
        "q=Ana&from=2026-09-01&to=2026-09-06&channel=PDV&paymentMethod=FIADO&receivableStatus=OPEN",
      )), {
        page: 1, q: "Ana", from: "2026-09-01", to: "2026-09-06", channel: "PDV",
        status: "ALL", paymentMethod: "FIADO", paymentStatus: "ALL", receivableStatus: "OPEN",
      })
    })

    test("serializes an order without User from Customer and snapshots", () => {
      const item = serializeAdminOrderListItem({
        user: null, customer: { name: "Ana", email: null, phone: "85999990000" },
        customerNameSnapshot: "Ana", customerEmailSnapshot: null, customerPhoneSnapshot: "85999990000",
      } as never)
      assert.equal(item.customerName, "Ana")
      assert.equal(item.customerPhone, "85999990000")
    })

- [ ] **Step 2: Executar os testes para confirmar a falha inicial**

Run: node --import tsx --test tests/admin-orders.test.ts
Expected: falha porque os filtros e user nulo ainda nao sao suportados.

- [ ] **Step 3: Implementar filtros server-side e serializacao**

Criar AdminOrdersFilters para q, from, to, channel, status, paymentMethod, paymentStatus, receivableStatus e page. Aceitar somente enums conhecidos. Construir Prisma.OrderWhereInput com busca por orderNumber, snapshots, Customer.name e Customer.phone; aplicar createdAt gte/lte, channel, status, paymentMethod, paymentStatus e receivable.status.

Incluir user, customer e receivable nas selecoes. Serializar nome/e-mail/telefone por snapshot, Customer e User nessa ordem. Retornar receivableOpenAmount e receivableStatus quando houver titulo.

- [ ] **Step 4: Atualizar a pagina Pedidos**

Substituir links isolados por formulario GET de busca, periodo e selects. Fazer buildOrdersHref receber todos os filtros e preserva-los em pagina seguinte/anterior. Adicionar coluna Saldo somente quando houver titulo e link ao detalhe do cliente.

- [ ] **Step 5: Executar testes e build**

Run: node --import tsx --test tests/admin-orders.test.ts && npm run build
Expected: filtros sao parseados, pedido sem User renderiza e a pagina compila.

- [ ] **Step 6: Commitar a consulta**

    git add lib/admin-orders.ts app/admin/orders/page.tsx tests/admin-orders.test.ts
    git commit -m "feat: filter admin orders by titles"

### Task 7: Dashboard e validacao final

**Files:**
- Modify: lib/admin-dashboard.ts:1-760
- Modify: app/admin/page.tsx:650-800
- Test: tests/admin-dashboard.test.ts
- Test: tests/customer-credit.test.ts
- Test: tests/pdv-fiado.test.ts

**Interfaces:**
- Consumes: pedidos DELIVERED fiado, titulos e CustomerPayment nao estornado.
- Produces: venda comercial por data de compra e receita financeira por data de recebimento, sem dupla contagem.

- [ ] **Step 1: Escrever teste de separacao comercial/financeira**

    test("counts delivered fiado sale commercially and receipt financially", async () => {
      const dashboard = await getAdminDashboardData(prisma as never, 1, 8, "30d")
      assert.equal(dashboard.commercial.cards.salesTotal, 100)
      assert.equal(dashboard.financial.cards.receivedRevenue, 40)
      assert.equal(dashboard.financial.cards.openReceivables, 60)
    })

- [ ] **Step 2: Executar o teste para confirmar a falha inicial**

Run: node --import tsx --test tests/admin-dashboard.test.ts
Expected: falha porque dashboard ainda nao consulta CustomerPayment nem saldo aberto.

- [ ] **Step 3: Atualizar agregacoes e copy**

Manter vendas comerciais de pedidos PAID, SHIPPED e DELIVERED. No bloco financeiro, somar apenas CustomerPayment.amount onde reversedAt e nulo por receivedAt; expor receivedRevenue e openReceivables. Nao somar Order.total de pedido fiado em receivedRevenue. Atualizar captions para chamar caixa realizado de Recebido e saldo pendente de Titulos em aberto.

- [ ] **Step 4: Executar suite completa e verificacao manual**

Run: npm test && npm run lint -- . && npm run build
Expected: todos os testes passam, lint tem zero erros e build conclui.

Verificar manualmente:
1. Criar cliente somente com nome/telefone, vender fiado e confirmar pedido DELIVERED, titulo aberto e estoque decrementado.
2. Registrar pagamento parcial e outro que alcance dois titulos; conferir FIFO e estoque inalterado.
3. Bloquear cliente, recusar nova venda fiado e permitir recebimento.
4. Tentar estorno como SELLER e confirmar 403; repetir como ADMIN e confirmar saldo restaurado.
5. Tentar cancelar pedido parcialmente quitado, confirmar bloqueio; estornar e cancelar, confirmando uma unica devolucao de estoque.
6. Conferir aba Titulos e filtros de Pedidos por cliente, canal, periodo, pagamento e situacao de titulo.

- [ ] **Step 5: Commitar dashboard e cobertura final**

    git add lib/admin-dashboard.ts app/admin/page.tsx tests/admin-dashboard.test.ts tests/customer-credit.test.ts tests/pdv-fiado.test.ts
    git commit -m "feat: report fiado sales and receipts"

## Plan Self-Review

- Cobertura: Tasks 1-4 tratam schema, auditoria, estoque, FIFO, recebimento, estorno, bloqueio e cancelamento. Task 5 entrega detalhes do cliente com aba Titulos. Task 6 entrega Pedidos filtravel. Task 7 separa venda comercial de receita realizada e valida o fluxo completo.
- Fora de escopo: fiado online, limite, vencimento, juros, credito a favor, parcelamento de titulo e conversao retroativa de pedidos.
- Consistencia: FIADO, CustomerReceivable, CustomerPayment, CustomerPaymentAllocation, CustomerCreditEvent, registerCustomerPayment e as rotas usam os mesmos nomes em todas as tarefas.
- Seguranca: toda mutacao valida autorizacao, payload e saldo no servidor dentro de transacao; estorno e bloqueio exigem ADMIN.
