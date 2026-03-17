# 🛒 Prompt — Brabu's Performance Store
### Criação de E-commerce Completo · v2.1 — Sincronizado com PRD v2.1

---

## Comando de Execução

```
/orchestrate
```

---

## 📋 Instrução Principal

Siga o `@PRD.md` e crie um e-commerce completo chamado **Brabu's Performance Store**.

Crie um arquivo `TASKS.md` com todas as tarefas que você precisa realizar baseado no `@PRD.md`.
Use **checkboxes** e marque conforme for completando.

Use `@.env` para todas as variáveis de ambiente.

> 🐳 Vamos usar **docker-compose** com um container para banco de dados **PostgreSQL**.

---

## 🔢 Sequência de Execução

### 1. Crie o `TASKS.md` com o planejamento completo baseado no `@PRD.md`

---

### 2. Instale todas as dependências necessárias

```bash
npm install prisma @prisma/client stripe @stripe/stripe-js next-auth \
  zustand zod react-hook-form @hookform/resolvers \
  bcryptjs axios framer-motion \
  lucide-react class-variance-authority clsx tailwind-merge
```

---

### 3. Configure o Prisma com o schema completo do `@PRD.md` seção 6

O schema deve incluir **todos** os models e enums abaixo:

**Enums:**
- `Role` → `CUSTOMER`, `ADMIN`
- `OrderStatus` → `PENDING`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`, `FAILED`
- `ShippingType` → `NATIONAL`, `LOCAL_DELIVERY`, `PICKUP`
- `ProductType` → `SUPPLEMENT`, `FASHION`, `ACCESSORY`

**Models:**
- `User` — com `role`, `name`, `email`, `password`
- `Category` — com `slug`, `icon`, `active`
- `Product` — com `productType`, `images[]`, `flavors[]`, `sizes[]`, `weightKg`, `gender`, `featured`
- `Order` — com `shippingType`, `shippingCost`, `shippingCarrier`, `trackingCode`
- `OrderItem` — com `selectedFlavor`, `selectedSize`
- `LocalDeliveryZone` — cidades do Maciço de Baturité com preço e prazo
- `StoreSettings` — endereço, WhatsApp, Instagram, horários da loja física

Rode as **migrations** e o **seed completo**:
- Categorias de suplementos, moda fitness e acessórios
- 12+ produtos de exemplo com variações (sabores e tamanhos)
- Zonas de entrega local (Aracoiaba R$5, Baturité R$10, Capistrano R$10, demais cidades R$15~20)
- Configurações da loja (endereço: Rua Antônio Lopes, 571 — Aracoiaba-CE | WhatsApp: 5585997839040)
- Usuário admin: `admin@brabus.com` / `Admin@123`

---

### 4. Implemente todas as APIs conforme `@PRD.md` seção 7

**Autenticação:**
- `POST /api/auth/register`
- `POST /api/auth/[...nextauth]`

**Produtos e Categorias:**
- `GET/POST /api/products` — com filtros por categoria, tipo, sabor, tamanho
- `GET /api/products/[slug]`
- `GET /api/products/featured`
- `GET/POST /api/categories`
- CRUD admin: `/api/admin/products/[id]`, `/api/admin/categories/[id]`

**Pedidos:**
- `GET /api/orders` — pedidos do cliente logado
- `GET/PATCH /api/admin/orders/[id]`
- `PATCH /api/admin/orders/[id]/tracking` — código de rastreio

**Checkout e Pagamentos:**
- `POST /api/checkout` — criar Stripe Checkout Session
- `POST /api/stripe/webhook` — atualizar `Order.status` via eventos Stripe

**Frete — 3 modalidades obrigatórias:**
- `POST /api/shipping/calculate`:
  - `NATIONAL` → consultar API do **Melhor Envio** com CEP origem `62765000`
  - `LOCAL_DELIVERY` → consultar tabela `LocalDeliveryZone` pelo nome da cidade
  - `PICKUP` → retornar frete `R$ 0,00` com endereço da loja
- `GET /api/shipping/local-zones` — lista de cidades com entrega local
- CRUD admin: `/api/admin/shipping/zones`

**Loja e Social:**
- `GET /api/store/settings` — dados da loja física
- `PUT /api/admin/store/settings`
- `GET /api/address/[cep]` — proxy ViaCEP
- `GET /api/instagram/feed` — últimas 6 fotos (cache 1h)

**Dashboard e Upload:**
- `GET /api/admin/dashboard` — KPIs (receita, pedidos, clientes, estoque baixo)
- `POST /api/admin/upload` — upload de imagens de produtos

---

### 5. Crie todas as páginas da LOJA conforme `@PRD.md` seção 3

- `/` — Home: hero, feed Instagram, categorias em destaque, produtos em destaque
- `/products` — Listagem com filtros por categoria, tipo, sabor, tamanho e ordenação
- `/products/[slug]` — Detalhe: galeria, seleção de sabor/tamanho, botão adicionar ao carrinho
- `/cart` — Carrinho com Zustand + localStorage
- `/checkout` — **3 steps obrigatórios:**
  - Step 1: dados pessoais (pré-preenchidos se logado)
  - Step 2: seleção de entrega com as **3 modalidades:**
    - 🚚 Envio nacional via Melhor Envio (calculado pelo CEP)
    - 🏍️ Entrega local (detectar automaticamente cidades do Maciço de Baturité)
    - 🏪 Retirar na loja — grátis (Aracoiaba-CE)
  - Step 3: pagamento via Stripe Elements
- `/checkout/success` e `/checkout/cancel`
- `/account` — dados pessoais do cliente logado
- `/account/orders` e `/account/orders/[id]` — histórico e detalhe de pedidos
- `/auth/login` e `/auth/register`
- `/loja` — mapa Google Maps embutido, endereço, horários, botão WhatsApp, QR Code
- `/contato` — formulário, WhatsApp, Instagram, endereço completo

---

### 6. Crie o PAINEL ADMIN completo (`/admin`)

> ⚠️ Layout e navbar **completamente diferentes** da loja — sidebar própria, tema admin distinto.

- `/admin` — Dashboard: KPIs (receita, pedidos, clientes, estoque baixo), tabela últimos pedidos
- `/admin/products` — listagem, criar, editar (com upload de imagens e variações sabor/tamanho)
- `/admin/orders` — todos os pedidos, filtro por status, alterar status, registrar código de rastreio
- `/admin/categories` — CRUD de categorias
- `/admin/customers` — lista de clientes
- `/admin/shipping/zones` — CRUD de zonas de entrega local (cidades + preços)
- `/admin/settings` — configurações da loja (endereço, WhatsApp, Instagram, horários)

---

### 7. Configure a autenticação (NextAuth v5)

- Credentials provider com email + senha (hash bcryptjs)
- Roles: `CUSTOMER` e `ADMIN`
- Middleware Next.js protegendo `/account/*` e `/admin/*`
- Redirect automático para login com `returnUrl`

---

### 8. Integre o Stripe para pagamentos

- Stripe Elements no step 3 do checkout
- Webhook `/api/stripe/webhook` com a seguinte lógica **obrigatória**:

  **`checkout.session.completed`:**
  ```
  1. Order.status = PAID
  2. Para cada OrderItem do pedido:
     Product.stock -= OrderItem.quantity   ← decrementar estoque automaticamente
  3. Se Product.stock <= 0: Product.stock = 0 (nunca negativo)
  4. Gerar link WhatsApp para o cliente com número do pedido
  ```

  **`payment_intent.payment_failed`:**
  ```
  1. Order.status = FAILED
  2. NÃO decrementar estoque (pagamento não confirmado)
  ```

- **Validação de estoque no carrinho e checkout:**
  - Ao adicionar ao carrinho: verificar se `quantity <= Product.stock`
  - Ao iniciar checkout: revalidar estoque de todos os itens
  - Se algum item estiver esgotado: bloquear checkout e alertar o cliente
  - Nunca permitir `quantity > stock` em nenhum momento do fluxo

- **Comportamento visual de estoque na loja:**
  - `stock = 0` → badge **"Esgotado"**, botão "Adicionar" desabilitado
  - `stock > 0 e stock < 10` → badge **"Últimas unidades"** em amarelo
  - `stock >= 10` → disponível normalmente

- **Controle de estoque no Admin (`/admin/products`):**
  - Campo de estoque editável manualmente pelo admin
  - KPI no Dashboard: alerta de produtos com `stock < 10`
  - Filtro na listagem de produtos: "Estoque baixo" e "Esgotados"
  - Histórico de venda não remove produto — apenas zera o estoque

---

### 9. Integre o WhatsApp Business em todas as páginas

- **Botão flutuante fixo** (canto inferior direito) com animação pulse verde
- Link: `https://wa.me/5585997839040?text=Olá!%20Vi%20o%20site%20da%20Brabu%27s%20e%20tenho%20interesse.`
- Na `/checkout/success`: botão "Acompanhar pelo WhatsApp" com número do pedido
- Na `/loja` e `/contato`: QR Code estático do WhatsApp

---

### 10. Aplique a identidade visual conforme `@PRD.md` seção 9

- Paleta: **Preto** `#000000` + **Dourado** `#C9A84C` + **Vermelho** `#CC2200`
- Fontes: **Bebas Neue** (títulos) + **Inter** (corpo)
- Tema: dark mode, glassmorphism em cards e modais
- Animações: Framer Motion em page transitions e entrada de elementos
- Responsivo **mobile-first** obrigatório em todos os componentes

---

### 11. Atualize o `TASKS.md` marcando tudo que foi feito

---

## ⚠️ REGRAS OBRIGATÓRIAS

> 1. **O painel `/admin` deve ter layout próprio** com navbar e sidebar completamente diferentes da loja.
> 2. **O checkout deve ter as 3 modalidades de frete** — sem isso o checkout está incompleto.
> 3. **Mobile-first** em todos os componentes.
> 4. **Nunca expor dados sensíveis** em respostas de API pública.
> 5. **Sempre referenciar o `@PRD.md`** antes de criar qualquer arquivo.
> 6. **Controle de estoque é obrigatório:** decrementar `Product.stock` automaticamente no webhook do Stripe. Nunca permitir compra de produto com `stock = 0`.

---

## 🧰 Stack Completa

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Banco de Dados | PostgreSQL 16 (Docker local / EasyPanel produção) |
| ORM | Prisma 5 |
| Autenticação | NextAuth.js v5 |
| Pagamentos | Stripe + Stripe Elements |
| Frete Nacional | Melhor Envio API |
| Estado Global | Zustand |
| Validação | Zod + react-hook-form |
| Hash de Senhas | bcryptjs |
| HTTP Client | Axios |
| UI | shadcn/ui + Tailwind CSS |
| Ícones | Lucide React |
| Animações | Framer Motion |
| WhatsApp | wa.me link + botão flutuante |
| Deploy | EasyPanel (VPS) via GitHub |

---

*Brabu's Performance Store — "Para quem treina de verdade" 💀🔥*
*Gerado por: Júnior Melo | Estratégia: Vibe Coding com Antigravity IDE + Agent Kit v2*
