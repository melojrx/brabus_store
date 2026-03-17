# 📋 TASKS — Brabu's Performance Store
> Planejamento baseado no PRD v2.1 e prompt-ecommerce-v2.md

## 1. Configuração e Dependências
- [x] Inicializar projeto Next.js 15 (App Router) + TypeScript
- [x] Instalar dependências (Prisma, Stripe, NextAuth, Zustand, Zod, React Hook Form, etc.)
- [x] Configurar Tailwind CSS, shadcn/ui e fontes (Bebas Neue, Inter)
- [x] Configurar `docker-compose.yml` para PostgreSQL local
- [x] Criar arquivo `.env` com variáveis iniciais

## 2. Banco de Dados e Prisma
- [x] Criar `prisma/schema.prisma` completo (User, Category, Product, Order, OrderItem, LocalDeliveryZone, StoreSettings)
- [x] Definir Enums (`Role`, `OrderStatus`, `ShippingType`, `ProductType`)
- [x] Criar backend de Seed `prisma/seed.ts` detalhado (admin, suplementos, moda, fretes)
- [x] Rodar `npx prisma migrate dev` e `npx prisma db seed`

## 3. APIs (Backend / Endpoints)
- [x] `/api/auth/register` e `[...nextauth]` (Credentials Provider, admin/roles)
- [x] Produtos (`/api/products`, `/api/products/[slug]`, `/api/products/featured`) e Categorias
- [ ] Admin CRUD (`/api/admin/products/[id]`, `/api/admin/categories/[id]`, `/admin/shipping/zones`)
- [x] Checkout (`/api/checkout`) e Stripe Webhook (`/api/stripe/webhook` com regra de estoque)
- [x] Frete (`/api/shipping/calculate`, `/api/shipping/local-zones`)
- [x] Dashboard e App (`/api/admin/dashboard`, `/api/store/settings`, `/api/instagram/feed`)

## 4. Camada de Frontend (Páginas Públicas da Loja)
- [x] `app/layout.tsx` (Tema dark, fonts, meta infos)
- [x] Componente Navbar e Footer (Canais, Contatos)
- [x] Componente Action Button WhatsApp Flutuante
- [x] `app/page.tsx` (Home: Hero, Instagram, Produtos Destaque, Categorias)
- [x] `app/products/page.tsx` (Listagem com filtros e paginação)
- [x] `app/products/[slug]/page.tsx` (Ver detalhes, variações)
- [ ] `app/loja/page.tsx` (Loja Física, Mapa, Horários, QR Code)
- [ ] `app/contato/page.tsx` (Formulário, Instagram, Zap)

## 5. Fluxos de Carrinho e Checkout (Frontend)
- [ ] `store/useCart.ts` (Zustand com LocalStorage)
- [ ] Carrinho Global Slide-over /Página `/cart`
- [ ] Checkout - Step 1: Componente de Autenticação / Cadastro Rápido / Dados Pessoais
- [ ] Checkout - Step 2: Entrega (Calculadora Melhor Envio / Detecção Zona Local / Retirada)
- [ ] Checkout - Step 3: API do Stripe Elements integrado no App
- [ ] Telas `/checkout/success` e `/checkout/cancel`

## 6. Área Logada (Clientes) e Gestão Administrativa
- [ ] Área do Cliente (`/account`, `/account/orders/[id]`)
- [ ] Painel Admin: Layout dedicado + Navbar Fixa
- [ ] Painel Admin: Dashboard de KPIs (`/admin`)
- [ ] Painel Admin: Componentes de Gestão de Produtos, Controle de Estoque/Variação
- [ ] Painel Admin: Interface para Categorias, Clientes e Delivery Zones
- [ ] Painel Admin: Configurações Gerais da Loja

## 7. Ajustes, Segurança e Deploy
- [ ] Refinar Animações com Framer Motion e ajustes Mobile-First (Bebas Neue + Inter)
- [ ] Revisar controle de acesso (Middleware Admin vs Customer)
- [ ] Rodar Teste / Script de Segurança local ou validações via Zod antes do commit
- [ ] Preparar para EasyPanel VPS Deploy
