# 🎼 PLAN — Brabu's Performance Store
> Planejamento de Orquestração baseado no `PRD.md v2.1` e `prompt-ecommerce-v2.md`

## 1. Visão Geral
A Brabu's Performance Store é um e-commerce B2C completo para suplementação e moda fitness. Este plano define a alocação de agentes e as prioridades para a **Fase 2 da Orquestração**.

## 2. Divisão de Agentes

### Grupo 1: Foundation (Arquitetura e Dados)
**Agentes:** `database-architect`, `security-auditor`
**Responsabilidades:**
- Configurar docker-compose para PostgreSQL
- Definir `schema.prisma` com os models User, Product, Category, Order, OrderItem, LocalDeliveryZone, e StoreSettings.
- Desenvolver o `prisma/seed.ts` detalhado com produtos de exemplo.
- Configurar `.env` e validações iniciais.

### Grupo 2: Core (Backend e APIs)
**Agentes:** `backend-specialist`, `security-auditor`
**Responsabilidades:**
- Integrar Stripe (Pagamentos via Elements e Webhooks).
- Criar a lógica de cálculo de frete (Melhor Envio + Entrega Local).
- Implementar autenticação central com NextAuth v5.
- Construir os endpoints da API (categorias, produtos, pedidos e dashboard).

### Grupo 3: Interface e UX (Frontend)
**Agentes:** `frontend-specialist`, `seo-specialist`
**Responsabilidades:**
- Construir a UI completa com Next.js 15 (App Router), Tailwind CSS e shadcn/ui.
- Implementar o Carrinho de Compras global (Zustand).
- Desenvolver o Checkout Multi-step e o fluxo de pagamento.
- Criar o Painel Admin Protegido (`/admin/*`) com layout próprio.
- Adicionar Widget WhatsApp, Feed Instagram local e mapas.

### Grupo 4: Polish (Qualidade e Deploy)
**Agentes:** `test-engineer`, `performance-optimizer`
**Responsabilidades:**
- Auditar fluxos de checkout, pagamento via webhook e estoque.
- Rodar scripts de testes e otimização.
- Garantir a viabilidade para deploy futuro via EasyPanel.

## 3. Critérios de Sucesso
- Check-out operando as 3 modalidades de entrega sem falhas.
- Stripe Webhook deduzindo estoque corretamente apenas em `checkout.session.completed`.
- Autenticação e redirecionamento de rotas protegidas funcionando 100%.
- Painel Administrativo funcional e isolado visualmente da Loja Pública.
- `TASKS.md` completamente marcado ao final das execuções paralelas.
