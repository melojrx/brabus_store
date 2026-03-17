# PRD — Brabu's Performance Store
### Product Requirements Document · v2.1
> **"Para quem treina de verdade"**
> Documento de referência para a IA. Leia este arquivo integralmente antes de escrever qualquer linha de código.

---

## 📌 Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Páginas do Projeto](#3-páginas-do-projeto)
4. [Fluxos de Usuário](#4-fluxos-de-usuário)
5. [Funcionalidades por Módulo](#5-funcionalidades-por-módulo)
6. [Esquema do Banco de Dados](#6-esquema-do-banco-de-dados)
7. [API e Endpoints](#7-api-e-endpoints)
8. [Estrutura de Pastas](#8-estrutura-de-pastas)
9. [Design Guidelines](#9-design-guidelines)
10. [Uso do Agent Kit / Skills](#10-uso-do-agent-kit--skills)

---

## 1. Visão Geral

### 1.1 Sobre o Projeto

**Nome:** Brabu's Performance Store
**Slogan:** "Para quem treina de verdade"
**Tipo:** E-commerce B2C de saúde, suplementação e moda fitness — com presença física e digital integradas
**Segmento:** Lifestyle fitness — suplementos alimentares + moda esportiva + acessórios de treino
**Público-alvo:** Praticantes de musculação, crossfit, esportes de alta performance e qualquer pessoa comprometida com saúde, bem-estar e um estilo de vida ativo.

### 1.2 Identidade do Negócio

A Brabu's Performance Store **não é apenas uma loja online**. É uma marca com presença física e digital integradas, enraizada na comunidade fitness do interior do Ceará.

#### Endereço Físico
```
Rua Antônio Lopes, 571
Conjunto Cohab — Aracoiaba — CE
```

#### Contatos Oficiais
```
WhatsApp Business: (85) 99783-9040
Instagram: @brabus.performancestore
```

### 1.3 Área de Atuação e Entrega

A loja opera com **entrega para todo o Brasil**, mas com **foco estratégico no estado do Ceará** — especialmente nas cidades da região do **Maciço de Baturité**:

| Prioridade | Abrangência |
|---|---|
| 🥇 **Local / Entrega rápida** | Aracoiaba, Baturité, Capistrano, Aratuba, Mulungu, Pacoti, Guaramiranga, Caridade, Canindé, Itapiúna |
| 🥈 **Regional** | Fortaleza e Região Metropolitana do Ceará |
| 🥉 **Nacional** | Todo o Brasil via **Melhor Envio** (Correios, Jadlog, Total Express...) |

> **Diferencial competitivo:** Entregas locais no Maciço de Baturité com prazo reduzido e possibilidade de retirada na loja física em Aracoiaba-CE.

### 1.4 Propósito

A Brabu's Performance Store é a referência em saúde e estilo de vida fitness no Maciço de Baturité, combinando uma experiência de compra online premium com o atendimento próximo de quem conhece o cliente pelo nome. A identidade da marca é intensa, direta e autêntica — transmitindo a energia de quem leva o treino a sério.

### 1.5 Mix de Produtos

O catálogo é dividido em três grandes linhas:

#### 🧪 Linha de Suplementação
- Whey Protein (concentrado, isolado, hidrolisado)
- Creatina Monohidratada
- Pré-Workout
- BCAA (cápsulas e pó)
- Glutamina
- Termogênicos
- Vitaminas e Minerais (multivitamínico, vitamina D, magnésio)
- Hipercalóricos
- Colágeno e beleza

#### 👕 Linha de Moda Fitness
- Camisetas e regatas (masculino e feminino)
- Shorts e leggings
- Tops e sutiãs esportivos
- Bermudas de treino
- Meias esportivas
- Bonés e acessórios de cabeça
- Mochilas e bolsas de academia

#### 🏋️ Acessórios de Treino
- Luvas de musculação
- Faixas e cintos
- Shakers e garrafinhas
- Elásticos e bandas de resistência

### 1.6 Canais de Venda e Integração

```
┌─────────────────────────────────────────────────────────┐
│              BRABU'S PERFORMANCE STORE                   │
├──────────────────┬──────────────────┬────────────────────┤
│   LOJA FÍSICA    │   E-COMMERCE     │   SOCIAL MEDIA     │
│   Aracoiaba - CE │  brabus.com.br   │  Instagram +       │
│   Retirada local │  Entrega nacional│  WhatsApp Business │
└──────────────────┴──────────────────┴────────────────────┘
```

#### Canal 1 — E-commerce (foco deste PRD)
- Portal completo com catálogo, carrinho e checkout via Stripe
- Entrega nacional com foco regional no Ceará
- Cálculo de frete por CEP via **Melhor Envio** (multi-transportadora)

#### Canal 2 — WhatsApp Business `(85) 99783-9040`
- **Botão flutuante fixo** em todas as páginas (canto inferior direito)
- Link direto: `https://wa.me/5585997839040`
- Mensagem pré-preenchida ao clicar: *"Olá! Vi o site da Brabu's e tenho interesse em um produto."*
- Ao concluir pedido: opção de *"Confirmar e acompanhar pelo WhatsApp"*
- QR Code do WhatsApp na página de contato, footer e página da loja física

#### Canal 3 — Instagram
- **Feed do Instagram** na home (últimas 6 publicações via widget ou API)
- Botão "Siga-nos no Instagram" no header e footer
- Link do Instagram em todas as páginas
- Seção "Como nos encontrar" com links para redes sociais

#### Canal 4 — Loja Física (Aracoiaba-CE)
- Página dedicada `/loja` com:
  - Mapa do Google Maps embutido
  - Endereço completo e CEP
  - Horário de funcionamento
  - Botão de rota no Google Maps
  - WhatsApp para contato direto
- Opção **"Retirar na loja"** no checkout (frete grátis para retirada em Aracoiaba)
- Footer com endereço e mapa de localização em todas as páginas

### 1.7 Objetivos de Negócio

- Criar presença digital sólida para a Brabu's no Maciço de Baturité e no Ceará
- Integrar os canais físico (loja), digital (e-commerce) e social (Instagram + WhatsApp) em uma experiência unificada
- Vender suplementação e moda fitness para clientes de toda a região com entrega rápida
- Fortalecer o atendimento via WhatsApp Business para vendas conversacionais
- Exibir conteúdo do Instagram para engajamento e prova social
- Oferecer checkout seguro com Stripe e opção de retirada na loja física em Aracoiaba-CE
- Garantir experiência mobile-first, já que a maioria dos clientes acessa via smartphone

### 1.8 Escopo da v1.0 (MVP)

| ✅ Incluído no MVP | 🔜 Versões Futuras |
|---|---|
| Catálogo completo (suplementos + moda fitness) | Sistema de avaliações/reviews |
| Carrinho e checkout com Stripe | Programa de fidelidade / pontos |
| Autenticação de clientes | Cupons de desconto |
| Painel Admin completo | Instagram Shopping (tags de produto) |
| Gestão de pedidos | App mobile nativo |
| Histórico de pedidos do cliente | Integração com marketplaces |
| WhatsApp Widget flutuante em todas as páginas | Rastreamento de pedidos em tempo real |
| Feed do Instagram na home | Sistema de franquias/revendas |
| Página da loja física com mapa | Chat de suporte ao vivo |
| Opção "Retirar na loja" no checkout | NFe automática |
| Cálculo de frete via Melhor Envio + entrega local + retirada na loja | Programa de indicação |

---

## 2. Stack Tecnológica

### 2.1 Core

| Camada | Tecnologia | Versão | Justificativa |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 15.x | Full-stack em 1 repo, SSR nativo, IA domina muito bem |
| **Linguagem** | TypeScript | 5.x | Tipagem segura, melhora geração de código pela IA |
| **Banco de Dados** | PostgreSQL | 16.x | Robusto, relacional, suporte a JSON nativo |
| **ORM** | Prisma | 5.x | Schema declarativo, migrations simples, DX excelente |
| **Autenticação** | NextAuth.js (Auth.js v5) | 5.x | Sessão, providers, roles com mínima configuração |
| **Pagamentos** | Stripe | Latest | Padrão de mercado, webhooks confiáveis |
| **Estado Global** | Zustand | 4.x | Leve, simples, ideal para carrinho e sessão UI |
| **Validação** | Zod | 3.x | Validação de schemas tanto no front quanto no back |
| **Hash de Senhas** | bcryptjs | Latest | Segurança para senhas de usuários |

### 2.2 UI / Estilo

| Camada | Tecnologia | Versão |
|---|---|---|
| **Componentes** | shadcn/ui | Latest |
| **Estilo** | Tailwind CSS | 3.x |
| **Ícones** | Lucide React | Latest |
| **Fontes** | Google Fonts — Bebas Neue (títulos) + Inter (corpo) | Latest |
| **Animações** | Framer Motion | Latest |

### 2.3 Infraestrutura

| Camada | Tecnologia |
|---|---|
| **Banco local** | PostgreSQL via Docker Compose |
| **Armazenamento de imagens** | Upload local em `/public/uploads/` (v1.0) |
| **Deploy** | EasyPanel (VPS com Docker nativo) |
| **Repositório** | GitHub (auto-deploy via EasyPanel) |
| **SSL + Proxy** | EasyPanel built-in (Let's Encrypt automático) |

### 2.4 Ferramentas de Desenvolvimento

```
- Antigravity IDE (Google) com Agent Kit v2
- Docker Desktop (ambiente local)
- Stripe CLI (testes de webhook locais)
- Prisma Studio (visualização do banco)
```

### 2.5 Dependências — package.json

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "next-auth": "^5.0.0",
    "stripe": "^14.0.0",
    "@stripe/stripe-js": "^3.0.0",
    "zustand": "^4.0.0",
    "zod": "^3.0.0",
    "bcryptjs": "^2.4.3",
    "framer-motion": "^11.0.0",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "autoprefixer": "latest",
    "postcss": "latest",
    "@types/bcryptjs": "latest",
    "@types/node": "latest",
    "@types/react": "latest"
  }
}
```

---

## 3. Páginas do Projeto

### 3.1 Loja (Público)

| Rota | Página | Descrição |
|---|---|---|
| `/` | **Home** | Hero section, banners de categorias, produtos em destaque, CTA |
| `/products` | **Listagem de Produtos** | Grid de produtos com filtros por categoria, busca e ordenação |
| `/products/[slug]` | **Detalhe do Produto** | Imagens, descrição, tabela nutricional, botão de compra |
| `/cart` | **Carrinho** | Resumo dos itens, quantidades, subtotal, botão para checkout |
| `/checkout` | **Checkout** | Dados do cliente, endereço de entrega, pagamento via Stripe |
| `/checkout/success` | **Confirmação de Pedido** | Mensagem de sucesso, número do pedido, resumo da compra |
| `/checkout/cancel` | **Pagamento Cancelado** | Mensagem de cancelamento com link para voltar ao carrinho |
| `/account` | **Minha Conta** | Dados pessoais, histórico de pedidos |
| `/account/orders` | **Meus Pedidos** | Lista de pedidos com status e detalhes |
| `/account/orders/[id]` | **Detalhe do Pedido** | Itens, valores, status de entrega |
| `/auth/login` | **Login** | Form de login com e-mail e senha |
| `/auth/register` | **Cadastro** | Form de cadastro de novo cliente |
| `/loja` | **Nossa Loja** | Endereço, mapa Google Maps, horários, WhatsApp, como chegar |
| `/contato` | **Contato** | Formulário, WhatsApp, Instagram, endereço, QR Code do WhatsApp |

### 3.2 Painel Admin (Restrito — `/admin`)

> ⚠️ O admin tem layout e navbar **completamente diferentes** da loja.

| Rota | Página | Descrição |
|---|---|---|
| `/admin` | **Dashboard** | KPIs: receita, pedidos, produtos, clientes |
| `/admin/products` | **Produtos** | Listagem com busca, filtros e ações |
| `/admin/products/new` | **Novo Produto** | Formulário de criação de produto |
| `/admin/products/[id]/edit` | **Editar Produto** | Formulário de edição de produto |
| `/admin/orders` | **Pedidos** | Listagem de todos os pedidos com filtro por status |
| `/admin/orders/[id]` | **Detalhe do Pedido** | Itens do pedido, dados do cliente, alterar status |
| `/admin/categories` | **Categorias** | CRUD de categorias de produtos |
| `/admin/customers` | **Clientes** | Listagem de clientes cadastrados |

---

## 4. Fluxos de Usuário

### 4.1 Fluxo de Compra (Principal)

```
[HOME]
  └── Clica em produto ou categoria
        └── [LISTAGEM] → Filtra / Busca
              └── Clica em produto
                    └── [DETALHE DO PRODUTO]
                          └── Clica "Adicionar ao Carrinho"
                                └── [CARRINHO] (slide-over ou página)
                                      └── Clica "Finalizar Compra"
                                            └── Não logado? → [LOGIN] / [CADASTRO]
                                                  └── Logado? → [CHECKOUT]
                                                        └── Preenche dados + endereço
                                                              └── Clica "Pagar com Stripe"
                                                                    └── Redireciona Stripe
                                                                          ├── Sucesso → [/checkout/success]
                                                                          └── Cancelado → [/checkout/cancel]
```

### 4.2 Fluxo de Cadastro / Login

```
[AUTH/REGISTER]
  ├── Preenche nome, e-mail, senha
  ├── Validação Zod no frontend
  ├── POST /api/auth/register
  └── Redireciona para login ou sessão automática

[AUTH/LOGIN]
  ├── Preenche e-mail e senha
  ├── NextAuth credentials provider
  └── Redireciona para /account ou página anterior (returnUrl)
```

### 4.3 Fluxo do Administrador

```
[/admin] (requer role: ADMIN)
  ├── Dashboard com KPIs em tempo real
  ├── Gerencia produtos (criar, editar, ativar/desativar, deletar)
  ├── Gerencia categorias
  ├── Visualiza e atualiza status de pedidos
  └── Consulta lista de clientes
```

### 4.4 Fluxo de Webhook Stripe

```
[Stripe] → POST /api/stripe/webhook
  ├── checkout.session.completed → Atualiza Order.status = PAID
  ├── payment_intent.payment_failed → Order.status = FAILED
  └── refund.created → Order.status = REFUNDED
```

---

## 5. Funcionalidades por Módulo

### 5.1 Módulo: Catálogo

- Listagem de produtos com paginação (12 por página)
- Filtro por categoria via query string (`?category=whey-protein`)
- Filtro por tipo de produto: **Suplementos** ou **Moda Fitness** (mega-categorias)
- Filtro por tamanho (P, M, G, GG) — para produtos de moda fitness
- Filtro por sabor — para suplementos com variação de sabor
- Ordenação: mais recentes, menor preço, maior preço, mais vendidos
- Busca por nome de produto (fulltext simples)
- Badge de "Esgotado" quando `stock = 0`
- Badge de "Destaque" para produtos marcados como `featured`
- Badge de "Novo" para produtos criados nos últimos 15 dias
- Galeria de imagens no detalhe do produto (múltiplas fotos com thumbnail)
- Exibição de: nome, preço, peso/volume (suplementos), tamanho (moda), sabor, descrição completa
- Seleção de variação (tamanho / sabor) antes de adicionar ao carrinho

### 5.2 Módulo: Carrinho

- Carrinho persistido via **Zustand** com `localStorage`
- Adicionar / remover item
- Alterar quantidade (respeitando estoque disponível)
- Exibir subtotal em tempo real
- Contador de itens no ícone do header
- Carrinho como drawer lateral (slide-over) na listagem/detalhe
- Página de carrinho dedicada em `/cart`

### 5.3 Módulo: Checkout

#### Etapas do Checkout (3 steps)
- **Step 1 — Dados pessoais:** nome, e-mail, telefone (pré-preenchidos se logado)
- **Step 2 — Entrega:** seleção do tipo de entrega + endereço (se aplicável)
- **Step 3 — Pagamento:** resumo do pedido + Stripe Elements

#### 🚚 Modalidades de Entrega (Seleção obrigatória no Step 2)

---

**Opção 1 — Envio Nacional (Melhor Envio)**
- Exibida para qualquer CEP do Brasil
- Ao digitar o CEP, chama `/api/shipping/calculate` que consulta a API do **Melhor Envio**
- Retorna opções de transportadoras com prazo e valor (ex: PAC, SEDEX, Jadlog, Total Express)
- Cliente escolhe a transportadora de sua preferência
- Frete calculado com base no peso total do pedido + CEP de destino
- CEP de origem: CEP da loja em Aracoiaba-CE

**Opção 2 — Entrega Local (Mototaxi / Entrega Própria)**
- Exibida **somente** quando o CEP ou cidade selecionada pertence ao Maciço de Baturité
- Cidades atendidas: Aracoiaba, Baturité, Capistrano, Aratuba, Mulungu, Pacoti,
  Guaramiranga, Caridade, Canindé, Itapiúna (lista configurável no admin)
- Taxa fixa por cidade (configurável no painel admin):
  - Aracoiaba: R$ 5,00
  - Baturité / Capistrano: R$ 10,00
  - Demais cidades do Maciço: R$ 15,00
- Prazo estimado: mesmo dia ou próximo dia útil
- Campo de observação para combinar horário de entrega via WhatsApp

**Opção 3 — Retirar na Loja (Gratuito)**
- Sempre disponível independente do CEP
- Frete: R$ 0,00
- Endereço exibido: Rua Antônio Lopes, 571 — Conjunto Cohab — Aracoiaba — CE
- Botão "Como chegar" (Google Maps)
- Campo de observação para agendar horário de retirada
- Após confirmação do pedido: mensagem automática via link WhatsApp com endereço e horário

---

#### Fluxo Técnico do Checkout
- Validação de campos com **Zod + react-hook-form**
- Auto-preenchimento de endereço via **ViaCEP** ao digitar o CEP
- Detecção automática de cidade local ao preencher CEP (comparar com lista de cidades do Maciço)
- Cálculo de frete chamado automaticamente após CEP preenchido (debounce 800ms)
- Ao confirmar, cria o registro `Order` no banco com status `PENDING` e `shippingType` definido
- Após pagamento confirmado pelo webhook Stripe, atualiza para `PAID`
- Se `shippingType = PICKUP` ou `LOCAL_DELIVERY`: dispara link WhatsApp automático para o cliente

### 5.3.1 Módulo: Frete e Logística

#### Integração Melhor Envio
- **Credenciais:** `MELHOR_ENVIO_TOKEN` (sandbox e produção) nas variáveis de ambiente
- **Endpoint usado:** `POST https://melhorenvio.com.br/api/v2/me/shipment/calculate`
- **Payload enviado:** CEP origem (Aracoiaba-CE), CEP destino, peso total (kg), dimensões estimadas
- **Resposta:** lista de serviços disponíveis com nome, prazo e preço
- **Cache:** resultado cacheado por 30 minutos por combinação CEP+peso para evitar excesso de requisições
- **Fallback:** se API indisponível, exibir apenas opções de entrega local e retirada na loja

#### Tabela de Entrega Local (Configurável pelo Admin)
- Gerenciada via tabela `LocalDeliveryZone` no banco de dados
- Admin pode adicionar/editar/remover cidades e seus preços
- CEPs de cada cidade do Maciço de Baturité mapeados para detecção automática

#### Configuração de Peso dos Produtos
- Cada produto deve ter campo `weightKg` (peso em kg) para cálculo do frete
- Peso padrão: 0.5kg se não informado
- Frete calculado com soma dos pesos × quantidades do carrinho

#### Rastreamento de Pedidos (básico)
- Após despacho: admin registra código de rastreio no pedido (`trackingCode`)
- Cliente visualiza código de rastreio em `/account/orders/[id]`
- Link automático para rastreio no site dos Correios / transportadora

---

### 5.4 Módulo: Autenticação

- Cadastro com: nome, e-mail, senha (hash bcryptjs)
- Login com e-mail e senha via NextAuth Credentials Provider
- Sessão JWT persistida (não database session para simplicidade)
- Proteção de rotas: `/account/*` requer autenticação de cliente
- Proteção de rotas: `/admin/*` requer autenticação + `role = ADMIN`
- Middleware Next.js para redirect automático

### 5.5 Módulo: Conta do Cliente

- Visualizar e editar dados pessoais (nome, e-mail)
- Alterar senha
- Histórico de pedidos com status visual
- Detalhe de cada pedido (itens, valores, endereço, status)

### 5.5.1 Módulo: WhatsApp Business

- **Botão flutuante fixo** em todas as páginas (bottom-right, z-index alto)
- Ícone do WhatsApp com animação de pulso (pulse verde)
- Tooltip: "Fale conosco no WhatsApp!"
- Link: `https://wa.me/5585997839040?text=Olá!%20Vi%20o%20site%20da%20Brabu%27s%20e%20tenho%20interesse.`
- Na página de confirmação de pedido: botão "Acompanhar pelo WhatsApp" com mensagem pré-preenchida com número do pedido
- Na página `/contato` e `/loja`: QR Code estático do WhatsApp para uso offline (impressão)
- No footer: link direto para WhatsApp com ícone

### 5.5.2 Módulo: Instagram Integration

- **Feed do Instagram** na home (seção "Nos siga no Instagram"):
  - Exibe as 6 últimas publicações em grid 3x2
  - Implementar via widget externo (Behold.so, SnapWidget ou similar) ou link estático para o perfil
  - Fallback: se API não disponível, exibir grid estático com imagens curadas + link para perfil
- Link do Instagram no header (ícone), footer e página de contato
- Botão "Ver mais no Instagram" que abre o perfil em nova aba

### 5.5.3 Módulo: Página da Loja Física (`/loja`)

Conteúdo obrigatório da página:
- **Hero:** Banner com foto da fachada ou interior da loja
- **Endereço:** Rua Antônio Lopes, 571 — Conjunto Cohab — Aracoiaba — CE
- **Mapa:** Google Maps embutido (iframe) com pin na localização exata
- **Botão "Como chegar":** Abre Google Maps com rota para o endereço
- **Horário de funcionamento:** (a definir com o cliente — placeholder: Seg–Sex 8h–18h / Sáb 8h–13h)
- **WhatsApp:** Botão grande "Falar pelo WhatsApp" + QR Code
- **Região de entrega:** Lista visual das cidades do Maciço de Baturité atendidas
- **Opção de retirada:** Explicação de como funciona a retirada gratuita na loja

### 5.6 Módulo: Admin — Dashboard

- Cards de KPI:
  - Receita total (mês atual)
  - Total de pedidos
  - Pedidos pendentes
  - Total de clientes
  - Produtos com estoque baixo (< 10 unidades)
- Gráfico de pedidos por dia (últimos 7 dias)
- Tabela dos 5 pedidos mais recentes

### 5.7 Módulo: Admin — Produtos

- Listagem com: nome, categoria, preço, estoque, status (ativo/inativo)
- Busca por nome
- Filtro por categoria
- Criar produto: nome, slug (auto-gerado), descrição, preço, estoque, categoria, imagens, destaque (sim/não), ativo (sim/não)
- Editar produto: todos os campos
- Desativar / ativar produto (soft delete — não remove do banco)
- Upload de imagens salvas em `/public/uploads/products/`

### 5.8 Módulo: Admin — Pedidos

- Listagem com: número do pedido, cliente, data, valor total, status
- Filtro por status: PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED
- Detalhe do pedido: itens, cliente, endereço de entrega, forma de pagamento
- Alterar status do pedido manualmente

### 5.9 Módulo: Admin — Categorias

- CRUD completo: nome, slug, ícone/emoji (opcional)
- Não permitir deletar categoria com produtos vinculados

---

## 6. Esquema do Banco de Dados

### 6.1 Schema Prisma Completo

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// ENUM
// ─────────────────────────────────────────

enum Role {
  CUSTOMER
  ADMIN
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
  FAILED
}

enum ShippingType {
  NATIONAL       // Melhor Envio (PAC, SEDEX, Jadlog, etc.)
  LOCAL_DELIVERY // Entrega própria / mototaxi (Maciço de Baturité)
  PICKUP         // Retirada na loja (Aracoiaba-CE)
}

// ─────────────────────────────────────────
// MODELS
// ─────────────────────────────────────────

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(CUSTOMER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  orders    Order[]

  @@map("users")
}

model Category {
  id        String    @id @default(cuid())
  name      String
  slug      String    @unique
  icon      String?
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())

  products  Product[]

  @@map("categories")
}

enum ProductType {
  SUPPLEMENT
  FASHION
  ACCESSORY
}

model Product {
  id          String      @id @default(cuid())
  name        String
  slug        String      @unique
  description String
  price       Decimal     @db.Decimal(10, 2)
  stock       Int         @default(0)
  images      String[]    // Array de paths ou URLs
  featured    Boolean     @default(false)
  active      Boolean     @default(true)
  isNew       Boolean     @default(true)
  productType ProductType @default(SUPPLEMENT)

  // Campos para suplementos
  weight      String?  // Ex: "900g", "1kg", "300g" (exibição)
  weightKg    Float?   // Peso real em kg para cálculo de frete (ex: 0.9)
  flavors     String[] // Ex: ["Chocolate", "Baunilha", "Morango"]

  // Campos para moda fitness
  sizes       String[] // Ex: ["P", "M", "G", "GG"]
  gender      String?  // "masculino", "feminino", "unissex"
  color       String?  // Cor principal do produto

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id])

  orderItems  OrderItem[]

  @@map("products")
}

model Order {
  id              String      @id @default(cuid())
  status          OrderStatus @default(PENDING)
  total           Decimal     @db.Decimal(10, 2)
  stripeSessionId String?     @unique
  stripePaymentId String?

  // Modalidade e custo de entrega
  shippingType      ShippingType
  shippingCost      Decimal     @db.Decimal(10, 2) @default(0)
  shippingCarrier   String?     // "PAC", "SEDEX", "Jadlog", "Mototaxi", "Retirada"
  shippingDeadline  String?     // "3-5 dias úteis", "Mesmo dia", etc.
  trackingCode      String?     // Código de rastreio (preenchido pelo admin após envio)

  // Endereço de entrega (desnormalizado para preservar histórico)
  // Vazio se shippingType = PICKUP
  addressStreet       String?
  addressNumber       String?
  addressComplement   String?
  addressNeighborhood String?
  addressCity         String?
  addressState        String?
  addressZip          String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId    String
  user      User        @relation(fields: [userId], references: [id])

  items     OrderItem[]

  @@map("orders")
}

model OrderItem {
  id           String  @id @default(cuid())
  quantity     Int
  price        Decimal @db.Decimal(10, 2) // Preço no momento da compra
  selectedSize   String? // Tamanho selecionado (para moda fitness)
  selectedFlavor String? // Sabor selecionado (para suplementos)

  orderId   String
  order     Order   @relation(fields: [orderId], references: [id])

  productId String
  product   Product @relation(fields: [productId], references: [id])

  @@map("order_items")
}

// Zonas de entrega local — Maciço de Baturité
model LocalDeliveryZone {
  id          String  @id @default(cuid())
  city        String  // "Aracoiaba", "Baturité", "Capistrano"...
  state       String  @default("CE")
  price       Decimal @db.Decimal(10, 2) // Taxa de entrega para esta cidade
  deadlineText String @default("Mesmo dia ou próximo dia útil")
  active      Boolean @default(true)

  @@map("local_delivery_zones")
}

// Configurações gerais da loja (endereço, horários, contatos)
model StoreSettings {
  id                String  @id @default(cuid())
  addressStreet     String  @default("Rua Antônio Lopes, 571")
  addressComplement String  @default("Conjunto Cohab")
  addressCity       String  @default("Aracoiaba")
  addressState      String  @default("CE")
  addressZip        String  @default("62765-000")
  whatsapp          String  @default("5585997839040")
  instagram         String  @default("@brabus.performancestore")
  openingHours      String  @default("Seg–Sex: 8h–18h | Sáb: 8h–13h")
  googleMapsUrl     String?
  googleMapsEmbed   String?

  @@map("store_settings")
}
```

### 6.2 Diagrama de Relacionamentos

```
User (1) ──────────── (N) Order
Order (1) ─────────── (N) OrderItem
OrderItem (N) ──────── (1) Product
Product (N) ─────────── (1) Category
```

### 6.3 Seed de Dados Iniciais

```typescript
// prisma/seed.ts — Categorias e produtos de exemplo

// ── SUPLEMENTOS ──
Categorias:
- Whey Protein    (slug: whey-protein,  type: SUPPLEMENT)
- Creatina        (slug: creatina,      type: SUPPLEMENT)
- Pré-Workout     (slug: pre-workout,   type: SUPPLEMENT)
- BCAA            (slug: bcaa,          type: SUPPLEMENT)
- Vitaminas       (slug: vitaminas,     type: SUPPLEMENT)
- Termogênicos    (slug: termogenicos,  type: SUPPLEMENT)

// ── MODA FITNESS ──
- Camisetas       (slug: camisetas,     type: FASHION)
- Shorts e Bermudas (slug: shorts,      type: FASHION)
- Leggings e Tops (slug: leggings-tops, type: FASHION)
- Bonés e Bonés   (slug: bones,         type: FASHION)

// ── ACESSÓRIOS ──
- Acessórios      (slug: acessorios,    type: ACCESSORY)

Produtos seed (3 por categoria principal = 18+ produtos):

// Suplementos
"Whey Protein Concentrado Chocolate 900g" — R$ 89,90 | flavors: [Chocolate, Baunilha, Morango]
"Whey Protein Isolado Baunilha 900g"      — R$ 129,90 | flavors: [Baunilha, Morango]
"Creatina Monohidratada 300g"             — R$ 49,90  | weight: 300g
"Pré-Workout Extremo Red Fire 300g"       — R$ 79,90  | flavors: [Frutas Vermelhas, Limão]
"BCAA 2:1:1 120 cápsulas"                 — R$ 39,90
"Vitamina D3 + K2 60 cápsulas"            — R$ 34,90

// Moda Fitness
"Regata Dry Fit Masculina Brabu's"        — R$ 59,90 | sizes: [P,M,G,GG] | gender: masculino
"Legging Feminina Premium"                — R$ 89,90 | sizes: [P,M,G,GG] | gender: feminino
"Shorts de Treino Masculino"              — R$ 69,90 | sizes: [P,M,G,GG] | gender: masculino
"Boné Snapback Brabu's Performance"       — R$ 49,90 | sizes: [Único]

// Acessórios
"Shaker Brabu's 700ml"                    — R$ 29,90
"Luva de Musculação Pro"                  — R$ 44,90

// Usuário Admin seed
email: admin@brabus.com
senha: Admin@123 (bcrypt hash)
role: ADMIN

// Configuração da loja seed (StoreSettings)
endereço: Rua Antônio Lopes, 571 — Conjunto Cohab — Aracoiaba — CE
whatsapp: 5585997839040
horário: Seg–Sex: 8h–18h | Sáb: 8h–13h

// Zonas de entrega local seed (LocalDeliveryZone)
| Cidade           | Preço    | Prazo                       |
|------------------|----------|-----------------------------|
| Aracoiaba        | R$ 5,00  | Mesmo dia                   |
| Baturité         | R$ 10,00 | Mesmo dia ou próximo dia    |
| Capistrano       | R$ 10,00 | Mesmo dia ou próximo dia    |
| Aratuba          | R$ 15,00 | Próximo dia útil            |
| Mulungu          | R$ 15,00 | Próximo dia útil            |
| Pacoti           | R$ 15,00 | Próximo dia útil            |
| Guaramiranga     | R$ 15,00 | Próximo dia útil            |
| Caridade         | R$ 15,00 | Próximo dia útil            |
| Canindé          | R$ 20,00 | Próximo dia útil            |
| Itapiúna         | R$ 15,00 | Próximo dia útil            |
```

---

## 7. API e Endpoints

### 7.1 Autenticação

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Cadastro de novo cliente | Público |
| `POST` | `/api/auth/[...nextauth]` | Login / logout (NextAuth) | Público |
| `GET` | `/api/auth/session` | Dados da sessão atual | Público |

### 7.2 Produtos

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/products` | Listar produtos (com filtros e paginação) | Público |
| `GET` | `/api/products/[slug]` | Detalhe de um produto | Público |
| `GET` | `/api/products/featured` | Produtos em destaque (home) | Público |
| `POST` | `/api/admin/products` | Criar produto | ADMIN |
| `PUT` | `/api/admin/products/[id]` | Editar produto | ADMIN |
| `PATCH` | `/api/admin/products/[id]/toggle` | Ativar/desativar produto | ADMIN |
| `DELETE` | `/api/admin/products/[id]` | Deletar produto | ADMIN |

### 7.3 Categorias

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/categories` | Listar todas as categorias ativas | Público |
| `POST` | `/api/admin/categories` | Criar categoria | ADMIN |
| `PUT` | `/api/admin/categories/[id]` | Editar categoria | ADMIN |
| `DELETE` | `/api/admin/categories/[id]` | Deletar categoria | ADMIN |

### 7.4 Pedidos

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/orders` | Pedidos do cliente logado | CUSTOMER |
| `GET` | `/api/orders/[id]` | Detalhe de pedido do cliente | CUSTOMER |
| `GET` | `/api/admin/orders` | Todos os pedidos (admin) | ADMIN |
| `GET` | `/api/admin/orders/[id]` | Detalhe de qualquer pedido | ADMIN |
| `PATCH` | `/api/admin/orders/[id]/status` | Atualizar status do pedido | ADMIN |

### 7.5 Checkout / Stripe

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `POST` | `/api/checkout` | Criar Stripe Checkout Session | CUSTOMER |
| `POST` | `/api/stripe/webhook` | Receber eventos do Stripe | Stripe secret |

### 7.6 Upload

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `POST` | `/api/admin/upload` | Upload de imagem de produto | ADMIN |

### 7.7 Dashboard Admin

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | KPIs e dados do dashboard | ADMIN |

### 7.8 Endereço / Frete

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/address/[cep]` | Buscar endereço por CEP (proxy ViaCEP) | CUSTOMER |
| `POST` | `/api/shipping/calculate` | Calcula e retorna as 3 modalidades de frete para o CEP | CUSTOMER |
| `GET`  | `/api/shipping/local-zones` | Lista cidades do Maciço com preço e prazo de entrega local | Público |
| `GET`  | `/api/admin/shipping/zones` | Listar zonas de entrega local | ADMIN |
| `POST` | `/api/admin/shipping/zones` | Criar zona de entrega local | ADMIN |
| `PUT`  | `/api/admin/shipping/zones/[id]` | Editar zona de entrega local | ADMIN |
| `PATCH`| `/api/admin/orders/[id]/tracking` | Adicionar código de rastreio ao pedido | ADMIN |

### 7.9 Loja Física e Configurações

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/store/settings` | Retorna endereço, horários e contatos da loja | Público |
| `PUT` | `/api/admin/store/settings` | Atualizar configurações da loja | ADMIN |

### 7.10 Integração Social

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/api/instagram/feed` | Buscar feed do Instagram (cache de 1h) | Público |
| `GET` | `/api/whatsapp/link` | Gerar link wa.me com mensagem dinâmica | Público |

---

## 8. Estrutura de Pastas

```
brabus-store/
│
├── .agent/                          # Antigravity Kit (não commitar se usar .gitignore)
│   ├── agents/                      # 19+ Specialist Agents
│   ├── skills/                      # 36 Skills do Kit
│   ├── workflows/                   # 11 Slash Commands
│   └── rules/                       # Regras globais do workspace
│
├── app/                             # Next.js App Router
│   ├── (store)/                     # Grupo de rotas da loja
│   │   ├── layout.tsx               # Layout da loja (header + footer)
│   │   ├── page.tsx                 # Home
│   │   ├── products/
│   │   │   ├── page.tsx             # Listagem de produtos
│   │   │   └── [slug]/
│   │   │       └── page.tsx         # Detalhe do produto
│   │   ├── cart/
│   │   │   └── page.tsx             # Carrinho
│   │   ├── loja/
│   │   │   └── page.tsx             # Loja física — mapa, endereço, horários, WhatsApp
│   │   ├── contato/
│   │   │   └── page.tsx             # Contato — formulário, WhatsApp QR, Instagram, endereço
│   │   ├── checkout/
│   │   │   ├── page.tsx             # Checkout
│   │   │   ├── success/page.tsx     # Confirmação
│   │   │   └── cancel/page.tsx      # Cancelamento
│   │   └── account/
│   │       ├── layout.tsx           # Layout da área logada
│   │       ├── page.tsx             # Dados pessoais
│   │       └── orders/
│   │           ├── page.tsx         # Lista de pedidos
│   │           └── [id]/page.tsx    # Detalhe do pedido
│   │
│   ├── (auth)/                      # Grupo de rotas de autenticação
│   │   ├── layout.tsx               # Layout simples (sem header/footer)
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │
│   ├── admin/                       # Painel Admin (layout totalmente separado)
│   │   ├── layout.tsx               # Layout admin (sidebar + navbar admin)
│   │   ├── page.tsx                 # Dashboard
│   │   ├── products/
│   │   │   ├── page.tsx             # Listagem de produtos
│   │   │   ├── new/page.tsx         # Criar produto
│   │   │   └── [id]/edit/page.tsx   # Editar produto
│   │   ├── orders/
│   │   │   ├── page.tsx             # Listagem de pedidos
│   │   │   └── [id]/page.tsx        # Detalhe do pedido
│   │   ├── categories/
│   │   │   └── page.tsx             # CRUD de categorias
│   │   └── customers/
│   │       └── page.tsx             # Lista de clientes
│   │
│   └── api/                         # API Routes
│       ├── auth/
│       │   ├── [...nextauth]/route.ts
│       │   └── register/route.ts
│       ├── products/
│       │   ├── route.ts
│       │   ├── featured/route.ts
│       │   └── [slug]/route.ts
│       ├── categories/route.ts
│       ├── orders/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── checkout/route.ts
│       ├── stripe/
│       │   └── webhook/route.ts
│       ├── address/[cep]/route.ts
│       └── admin/
│           ├── products/
│           │   ├── route.ts
│           │   └── [id]/
│           │       ├── route.ts
│           │       └── toggle/route.ts
│           ├── categories/
│           │   ├── route.ts
│           │   └── [id]/route.ts
│           ├── orders/
│           │   ├── route.ts
│           │   └── [id]/
│           │       ├── route.ts
│           │       └── status/route.ts
│           ├── customers/route.ts
│           ├── dashboard/route.ts
│           └── upload/route.ts
│
├── components/                      # Componentes React reutilizáveis
│   ├── ui/                          # shadcn/ui (gerado automaticamente)
│   ├── store/                       # Componentes da loja
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── CategoryBadge.tsx
│   │   ├── HeroSection.tsx
│   │   └── CheckoutForm.tsx
│   ├── social/                      # Componentes de integração social
│   │   ├── WhatsAppButton.tsx        # Botão flutuante fixo WhatsApp (todas as páginas)
│   │   ├── WhatsAppQRCode.tsx        # QR Code estático do WhatsApp
│   │   └── InstagramFeed.tsx         # Grid com últimas publicações do Instagram
│   └── admin/                       # Componentes do painel admin
│       ├── AdminSidebar.tsx
│       ├── AdminHeader.tsx
│       ├── KpiCard.tsx
│       ├── OrdersTable.tsx
│       ├── ProductsTable.tsx
│       └── OrderStatusBadge.tsx
│
├── lib/                             # Utilitários e configurações
│   ├── prisma.ts                    # Singleton do Prisma Client
│   ├── auth.ts                      # Configuração NextAuth
│   ├── stripe.ts                    # Singleton do Stripe Client
│   ├── validations.ts               # Schemas Zod compartilhados
│   └── utils.ts                     # Funções utilitárias (formatPrice, etc.)
│
├── store/                           # Zustand stores
│   └── cartStore.ts                 # Estado global do carrinho
│
├── config/                          # Configurações estáticas
│   └── store.ts                     # Dados da loja (endereço, WhatsApp, horários)
│
├── hooks/                           # Custom React Hooks
│   ├── useCart.ts
│   └── useProducts.ts
│
├── types/                           # Tipos TypeScript globais
│   └── index.ts
│
├── middleware.ts                    # Proteção de rotas (Next.js Middleware)
│
├── constants/
│   └── store-info.ts                # Constantes da loja física (não mudam frequentemente)
│
├── prisma/
│   ├── schema.prisma                # Schema do banco de dados
│   └── seed.ts                      # Seed de dados iniciais
│
├── public/
│   ├── uploads/
│   │   └── products/                # Imagens de produtos (upload local)
│   ├── logo.png                     # Logo da Brabu's
│   └── og-image.png                 # Imagem Open Graph
│
├── docker-compose.yml               # PostgreSQL local
├── .env                             # Variáveis de ambiente (não commitar)
├── .env.example                     # Template de variáveis
└── TASKS.md                         # Gerado pela IA — checklist de tarefas
```

---

## 9. Design Guidelines

### 9.1 Identidade Visual

A identidade da Brabu's Performance Store é **dark, intensa e premium**. Inspirada no mundo do hardcore fitness, a marca transmite poder, seriedade e comprometimento. O mascote é uma caveira com olhos vermelhos em chamas, ladeada por atletas tatuados — evocando a ideia de que "aqui é para quem treina de verdade".

### 9.2 Paleta de Cores

```css
/* Cores principais — use exatamente estes valores */

--color-bg-primary:     #000000;  /* Preto puro — fundo principal */
--color-bg-secondary:   #0D0D0D;  /* Preto quase puro — cards, containers */
--color-bg-tertiary:    #1A1A1A;  /* Grafite escuro — inputs, hover */
--color-border:         #2A2A2A;  /* Bordas sutis */

--color-gold-primary:   #C9A84C;  /* Dourado metálico — títulos, destaques */
--color-gold-light:     #E2C97E;  /* Dourado claro — hover states */
--color-gold-dark:      #9A7B2C;  /* Dourado escuro — sombras douradas */

--color-red-primary:    #CC2200;  /* Vermelho intenso — CTAs, badges, urgência */
--color-red-hover:      #E53000;  /* Vermelho hover */
--color-red-muted:      #7A1500;  /* Vermelho escuro — backgrounds de alerta */

--color-text-primary:   #F5F5F5;  /* Branco suave — texto principal */
--color-text-secondary: #A0A0A0;  /* Cinza médio — texto secundário */
--color-text-muted:     #555555;  /* Cinza escuro — texto desabilitado */

--color-success:        #22C55E;  /* Verde — sucesso, disponível */
--color-warning:        #EAB308;  /* Amarelo — atenção, estoque baixo */
--color-error:          #EF4444;  /* Vermelho suave — erros de formulário */
```

### 9.3 Tipografia

```css
/* Fontes — importar do Google Fonts */

/* Títulos e destaques — agressivo e impactante */
font-family: 'Bebas Neue', sans-serif;
/* Uso: h1, h2, nomes de produtos, hero section, botões grandes */

/* Corpo do texto — limpo e legível */
font-family: 'Inter', sans-serif;
/* Uso: parágrafos, labels, formulários, tabelas, admin */
```

```
Hierarquia:
- H1 (hero):     Bebas Neue, 72px, uppercase, letter-spacing: 2px
- H2 (seções):   Bebas Neue, 48px, uppercase
- H3 (produtos): Bebas Neue, 32px
- Body:          Inter, 16px, regular
- Small/Caption: Inter, 14px, color: text-secondary
- Labels:        Inter, 12px, uppercase, letter-spacing: 1px
```

### 9.4 Componentes Visuais

#### Botões

```css
/* Primário — CTA principal (comprar, finalizar, salvar) */
btn-primary: background: var(--color-red-primary);
             color: white; font: Bebas Neue 18px uppercase;
             padding: 12px 32px; border-radius: 4px;
             hover: background: var(--color-red-hover);

/* Secundário — ações secundárias */
btn-secondary: background: transparent;
               border: 2px solid var(--color-gold-primary);
               color: var(--color-gold-primary);
               hover: background: var(--color-gold-primary); color: black;

/* Ghost — ações terciárias */
btn-ghost: background: transparent; color: var(--color-text-secondary);
           hover: color: var(--color-text-primary);
```

#### Cards de Produto

```
- Background: #0D0D0D
- Borda: 1px solid #2A2A2A
- Hover: borda dourada + elevação leve (box-shadow dourada sutil)
- Imagem: 1:1 ratio, object-fit: cover
- Nome: Bebas Neue, branco
- Preço: Inter bold, dourado
- Badge destaque: fundo vermelho, texto branco, uppercase
- Badge esgotado: fundo cinza, texto muted
```

#### Header da Loja

```
- Background: rgba(0,0,0,0.95) com backdrop-blur
- Sticky/fixed no scroll
- Logo à esquerda
- Navegação central (Produtos, Categorias)
- Ícone carrinho + contador à direita
- Border-bottom: 1px solid #2A2A2A
```

#### Hero Section (Home)

```
- Fundo: vídeo ou imagem de academia em dark overlay
- Título: Bebas Neue, maiúsculo, dourado, 80px+
- Subtítulo: Inter, branco, 20px
- CTA: botão vermelho grande
- Efeito: partículas douradas sutis ou gradient animado
```

### 9.5 Efeitos Visuais

```
- Glassmorphism (vidro fosco): usado em modais, drawers e hero overlays
  backdrop-filter: blur(16px);
  background: rgba(13, 13, 13, 0.85);
  border: 1px solid rgba(201, 168, 76, 0.15);

- Hover em cards: transform: translateY(-4px); transition: 0.2s ease;
- Loading states: skeleton com gradiente dark (shimmer effect)
- Animações: Framer Motion para page transitions e entrada de elementos
- Scrollbar: customizada com fundo dark e thumb dourado
```

### 9.6 Admin Design

```
- Background: #0D0D0D (levemente diferente da loja para contexto visual)
- Sidebar: #111111, largura 240px, ícones + labels
- Sidebar ativa: item com fundo dourado translúcido + borda esquerda vermelha
- Header admin: #1A1A1A com breadcrumb
- Tabelas: linhas zebradas dark (#0D0D0D / #111111)
- KPI Cards: glassmorphism com ícone colorido e valor em Bebas Neue
- Badges de status: cores distintas por OrderStatus
```

### 9.7 Responsividade

```
Mobile-first obrigatório.

Breakpoints (Tailwind padrão):
- sm:  640px+
- md:  768px+
- lg:  1024px+
- xl:  1280px+

Ajustes obrigatórios:
- Grid de produtos: 1 col (mobile) → 2 cols (sm) → 3 cols (md) → 4 cols (xl)
- Header mobile: menu hamburger com drawer lateral
- Carrinho: drawer de 100% height no mobile
- Admin: sidebar colapsável no mobile (ícones apenas)
- Checkout: single column no mobile, 2 cols no desktop
```

---

## 10. Uso do Agent Kit / Skills

> Esta seção instrui a IA sobre **como e quando** usar o Antigravity Kit durante o desenvolvimento.
> Referência: `github.com/vudovn/antigravity-kit` (20 agentes, 36 skills, 11 workflows)

### 10.1 Estrutura do Agent Kit

```
.agent/
├── agents/    → 20 agentes especialistas (frontend, backend, db, security...)
├── skills/    → 36 habilidades de domínio específico
├── workflows/ → 11 slash commands (/brainstorm, /create, /debug, etc.)
└── rules/     → Regras globais do workspace
```

> **Regra de ativação:** O sistema detecta automaticamente qual agente/skill aplicar.
> Para tarefas específicas, mencione o agente explicitamente.

### 10.2 Mapa de Comandos por Fase do Projeto

#### FASE 1 — Planejamento e Inicialização

```
/brainstorm
```
**Quando usar:** Antes de iniciar o código.
**O que faz:** Analisa o @PRD.md, faz perguntas relevantes, sugere funcionalidades adicionais, valida a estrutura proposta.

```
/create
```
**Quando usar:** Após validar o planejamento.
**O que faz:** Detecta que o projeto precisa de frontend e backend, aplica os agentes `@frontend-specialist` e `@backend-specialist` automaticamente, monta toda a estrutura inicial de pastas e arquivos.

#### FASE 2 — Desenvolvimento Ativo

```
/orchestrate
```
**Quando usar:** Para funcionalidades que cruzam múltiplas camadas (ex: checkout, autenticação, webhook Stripe).
**O que faz:** Coordena múltiplos agentes em paralelo:
- `@backend-specialist` → APIs e lógica de negócio
- `@database-architect` → Schema e queries Prisma
- `@frontend-specialist` → Componentes React e páginas
- `@security-auditor` → Validação e proteção de rotas

**Exemplos de uso:**

```
/orchestrate — Implemente o sistema de checkout completo seguindo @PRD.md seção 5.3
/orchestrate — Crie o painel admin seguindo @PRD.md seção 5.6, 5.7 e 5.8
/orchestrate — Configure autenticação seguindo @PRD.md seção 5.4
```

#### FASE 3 — UI/UX e Estilo

```
/ui-ux-pro-max
```
**Quando usar:** Após gerar as páginas funcionais.
**O que faz:** Aplica o design guidelines do @PRD.md seção 9, adiciona efeitos de glassmorphism, animações Framer Motion, tipografia Bebas Neue/Inter e a paleta de cores dark/gold/red.

**Instruções específicas:**
> Ao executar `/ui-ux-pro-max`, referencie explicitamente a seção 9 deste PRD.
> As cores, fontes e efeitos descritos ali são obrigatórios para manter a identidade da Brabu's.

#### FASE 4 — Qualidade e Testes

```
/test
```
**Quando usar:** Após concluir cada módulo principal.
**O que faz:** Gera testes automatizados cobrindo:
- CRUD de produtos
- Fluxo de autenticação
- Criação de pedidos
- Integração com Stripe (mock)
- Proteção de rotas admin

```
/enhance
```
**Quando usar:** Antes do deploy.
**O que faz:** Varredura do código buscando melhorias de:
- Performance (memoização, queries N+1, lazy loading)
- Segurança (sanitização de inputs, exposição de dados, headers HTTP)
- Organização (DRY, separação de responsabilidades)

#### FASE 5 — Acompanhamento e Deploy

```
/status
```
**Quando usar:** A qualquer momento para checar o progresso.
**O que faz:** Gera relatório completo:
- ✅ O que está completo
- ⚠️ O que está incompleto
- ❌ Erros pendentes
- 📊 % de completude vs @PRD.md

```
/debug
```
**Quando usar:** Quando surgir qualquer bug.
**O que faz:** Análise sistemática da causa raiz com solução sugerida.

```
/deploy
```
**Quando usar:** Após `/status` mostrar 100% e `/test` passar.
**O que faz:** Guia o processo de deploy, neste projeto via EasyPanel.

### 10.3 Agentes Especialistas — Acionamento Manual

Quando necessário, ative agentes específicos explicitamente:

| Tarefa | Agente a mencionar |
|---|---|
| JWT, roles, proteção de rotas | `@security-auditor` |
| Componentes React, animações | `@frontend-specialist` |
| APIs, lógica de negócio | `@backend-specialist` |
| Prisma, queries, migrations | `@database-architect` |
| Testes unitários e e2e | `@testing-engineer` |
| Deploy, Docker, CI/CD | `@devops-specialist` |
| UX, fluxos de usuário | `@ux-designer` |

### 10.4 Skills Relevantes (Auto-ativadas por contexto)

As seguintes skills do kit são ativadas automaticamente quando o contexto bate:

| Contexto de código | Skill ativada |
|---|---|
| Desenvolvimento de API REST | `api-design` |
| Componentes React/Next.js | `react-patterns` |
| Autenticação e segurança | `auth-security` |
| Integração de pagamentos | `payment-integration` |
| Otimização de performance | `performance-optimization` |
| TypeScript e tipagem | `typescript-best-practices` |
| Docker e containers | `docker-compose` |
| Prisma e banco de dados | `database-design` |

### 10.5 Sequência Recomendada de Comandos

```
1. /brainstorm     → Validar estrutura com o PRD
2. /create         → Gerar estrutura base do projeto
3. /orchestrate    → Implementar banco de dados (schema + seed)
4. /orchestrate    → Implementar autenticação
5. /orchestrate    → Implementar catálogo (produtos + categorias)
6. /orchestrate    → Implementar carrinho e checkout
7. /orchestrate    → Implementar painel admin completo
8. /ui-ux-pro-max  → Aplicar identidade visual Brabu's
9. /test           → Gerar e rodar testes
10. /enhance       → Otimizar performance e segurança
11. /status        → Verificar completude
12. /deploy        → Deploy no EasyPanel
```

### 10.6 Regras de Uso da IA

> Estas regras são aplicadas globalmente via `.agent/rules/`

1. **Sempre referenciar o PRD:** Antes de criar qualquer arquivo, consultar as seções relevantes deste documento.
2. **Mobile-first obrigatório:** Todo componente deve ser responsivo por padrão.
3. **TypeScript strict:** Nenhum tipo `any` implícito. Criar interfaces em `/types/index.ts`.
4. **Validação dupla:** Toda entrada de dados deve ser validada com Zod tanto no cliente quanto no servidor.
5. **Nunca expor dados sensíveis:** Senhas, `stripeSecretKey` e `DATABASE_URL` jamais devem aparecer em respostas de API públicas.
6. **Atualizar TASKS.md:** Marcar cada tarefa como concluída no `TASKS.md` após completá-la.
7. **Commits semânticos:** Usar `feat:`, `fix:`, `chore:`, `docs:` nos commits.

---

## 🔑 Variáveis de Ambiente

### `.env` (desenvolvimento local)

```env
# Banco de Dados
DATABASE_URL="postgresql://admin:senha_forte@localhost:5432/brabus_store"

# NextAuth
NEXTAUTH_SECRET="gere_com_openssl_rand_base64_32"
NEXTAUTH_URL="http://localhost:3000"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### `.env.production` (EasyPanel)

```env
DATABASE_URL="postgresql://admin:senha_producao@brabus-db:5432/brabus_store"
NEXTAUTH_SECRET="secret_producao_diferente"
NEXTAUTH_URL="https://seudominio.com.br"
NEXT_PUBLIC_STRIPE_PUBLIC_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_live_..."
NEXT_PUBLIC_APP_URL="https://seudominio.com.br"
NODE_ENV="production"
```

---

## 📋 Docker Compose (desenvolvimento local)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    container_name: brabus-db-local
    environment:
      POSTGRES_DB: brabus_store
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: senha_forte
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d brabus_store"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

---

*PRD v1.0 — Brabu's Performance Store*
*"Para quem treina de verdade" 💀🔥*
*Gerado por: Júnior Melo | Estratégia: Vibe Coding com Antigravity IDE + Agent Kit v2*
