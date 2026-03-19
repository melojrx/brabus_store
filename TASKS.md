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
- [x] Definir Enums principais (`Role`, `OrderStatus`, `ShippingType`)
- [x] Criar backend de Seed `prisma/seed.ts` detalhado (admin, suplementos, moda, fretes)
- [x] Rodar `npx prisma migrate dev` e `npx prisma db seed`
- [x] Centralizar o Prisma Client em singleton compartilhado para evitar excesso de conexões no `next dev`

## 3. APIs (Backend / Endpoints)
- [x] `/api/auth/register` e `[...nextauth]` (Credentials Provider, admin/roles)
- [x] Produtos (`/api/products`, `/api/products/[slug]`, `/api/products/featured`) e Categorias
- [x] Admin CRUD (`/api/admin/products/[id]`, `/api/admin/categories/[id]`, `/admin/shipping/zones`)
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
- [x] `app/loja/page.tsx` (Loja Física, Mapa, Horários, QR Code)
- [x] `app/contato/page.tsx` (Formulário, Instagram, Zap)

## 5. Fluxos de Carrinho e Checkout (Frontend)
- [x] `store/cartStore.ts` (Zustand com LocalStorage)
- [x] Carrinho Global Slide-over / Página `/cart`
- [x] Checkout - Step 1: Componente de Autenticação / Cadastro Rápido / Dados Pessoais
- [x] Checkout - Step 2: Entrega (Calculadora Melhor Envio / Detecção Zona Local / Retirada)
- [x] Checkout - Step 3: API do Stripe Elements integrado no App
- [x] Telas `/checkout/success` e `/checkout/cancel`
- [x] Isolar persistência do carrinho por usuário autenticado no mesmo navegador

## 6. Área Logada (Clientes) e Gestão Administrativa
- [x] Área do Cliente (`/account`, `/account/orders/[id]`)
- [x] Painel Admin: Layout dedicado + Navbar Fixa
- [x] Painel Admin: Dashboard de KPIs (`/admin`)
- [x] Painel Admin: Componentes de Gestão de Produtos, Controle de Estoque/Variação
- [x] Painel Admin: Interface para Categorias, Clientes e Delivery Zones
- [x] Painel Admin: Configurações Gerais da Loja

## 7. Ajustes, Segurança e Deploy
- [x] Refinar Animações com Framer Motion e ajustes Mobile-First (Bebas Neue + Inter)
- [x] Revisar controle de acesso (Middleware Admin vs Customer)
- [x] Rodar Teste / Script de Segurança local ou validações via Zod antes do commit
- [x] Preparar para EasyPanel VPS Deploy

## 8. Refatoração do Catálogo, Estoque e Margem
> Escopo formalizado em `docs/PLAN.md`

### 8.1 Modelagem Prisma e Migração
- [x] Remover dependência de `ProductType` da arquitetura do catálogo
- [x] Evoluir `Category` para hierarquia simples com `parentId` e profundidade máxima de 2 níveis
- [x] Adicionar flags de comportamento em `Category` (`supportsSize`, `supportsColor`, `supportsFlavor`, `supportsWeight`, `trackStockByVariant`)
- [x] Adicionar `costPrice` em `Product`
- [x] Criar model `ProductVariant` com estoque operacional
- [x] Evoluir `OrderItem` com snapshots comerciais (`unitPrice`, `unitCost`, nomes e variante)
- [x] Criar migration incremental sem apagar os campos legados no primeiro passo

### 8.2 Backfill e Seed
- [x] Criar categorias-pai: `Roupas Fitness`, `Acessórios`, `Suplementos`, `Alimentação Fitness`
- [x] Reorganizar categorias atuais como subcategorias das categorias-pai
- [x] Gerar uma variante default para cada produto existente usando o estoque atual
- [x] Atualizar `prisma/seed.ts` para o novo modelo de categorias, subcategorias e variantes
- [x] Definir estratégia inicial para `costPrice` dos produtos existentes
  Política adotada: produtos legados sem custo conhecido permanecem com `costPrice = null` até preenchimento administrativo

### 8.3 APIs Admin e Públicas
- [x] Atualizar `/api/admin/categories` para suportar categoria pai, subcategoria e flags
- [x] Atualizar `/api/admin/products` para criar/editar produtos com variantes
- [x] Atualizar `/api/products` e `/api/products/[slug]` para retornar subcategoria e variantes
- [x] Atualizar filtros da loja para navegar por categoria e subcategoria
- [x] Garantir compatibilidade temporária durante a fase de transição do schema

### 8.4 Admin UI
- [x] Refatorar gestão de categorias para cadastrar categoria pai e subcategoria
- [x] Refatorar cadastro de produto para selecionar apenas subcategoria
- [x] Exibir campos do produto dinamicamente conforme flags da subcategoria
- [x] Criar editor simples de variantes e estoque no admin
- [x] Exibir `costPrice` no cadastro do produto com validação adequada

### 8.5 Loja, Carrinho e Checkout
- [x] Atualizar a página de produto para seleção por variante real
- [x] Exigir seleção de variante quando tamanho, cor ou sabor forem aplicáveis
- [x] Atualizar carrinho para armazenar `productVariantId` e snapshots necessários
- [x] Atualizar checkout para validar estoque por variante
- [x] Atualizar webhook Stripe para decrementar estoque em `ProductVariant`

### 8.6 Dashboard e KPI
- [x] Estruturar dashboard admin em duas abas: `Visão Geral` e `Acompanhamento Financeiro`
- [x] Exibir cards na aba `Visão Geral`: `Receita Total`, `Total de Pedidos`, `Pedidos Pendentes`, `Alertas de Estoque`
- [x] Exibir tabela paginada de últimos pedidos com `Id Pedido`, `Cliente`, `Data`, `Valor`, `Status` e ação de visualizar detalhes
- [x] Exibir cards na aba `Acompanhamento Financeiro`: `Faturamento`, `Custo`, `Lucro Bruto`, `Margem`
- [x] Adicionar gráfico de linha para evolução no tempo
- [x] Adicionar gráfico de barras para categoria e subcategoria
- [x] Adicionar tabela/ranking de produtos mais rentáveis
- [x] Basear KPIs financeiros em `OrderItem.unitPrice`, `OrderItem.unitCost` e snapshots históricos
- [x] Implementar tudo de forma leve, sem filtros ou relatórios complexos nesta fase

### 8.7 Corte e Limpeza
- [x] Remover leituras restantes de `Product.stock`
- [x] Remover leituras restantes de `productType`
- [x] Remover arrays legados substituídos por variantes quando o rollout estiver estável
- [x] Aplicar migration final removendo `productType`, `stock`, `sizes`, `flavors` e `color` de `Product`
- [x] Revisar testes, validações de API e fluxos críticos após a migração

### 8.8 Estabilização Pós-Migração
- [x] Bloquear checkout `NATIONAL` e `LOCAL_DELIVERY` sem endereço obrigatório
- [x] Exigir preenchimento de endereço na UI de checkout para entregas que não sejam `PICKUP`
- [x] Alinhar disponibilidade pública para contar apenas variantes ativas vendáveis
- [x] Remover fallback visual que permite parecer disponível sem variante ativa válida
- [x] Garantir no admin que variante atualizada pertence ao produto editado
- [x] Integrar checkout UI com `/api/shipping/local-zones`
- [x] Integrar checkout UI com `/api/shipping/calculate`
- [x] Expor `LOCAL_DELIVERY` na UI quando houver zona aplicável

## 9. Lacunas Remanescentes do PRD
> Frente aberta a partir da revisão cruzada entre `PRD.md` e a implementação atual

### 9.1 Admin — Pedidos
- [x] Criar `app/admin/orders/page.tsx` com listagem administrativa dedicada
- [x] Adicionar filtro por status na listagem de pedidos do admin
- [x] Criar `GET /api/admin/orders`
- [x] Criar `PATCH /api/admin/orders/[id]/status`
- [x] Criar `PATCH /api/admin/orders/[id]/tracking`
- [x] Permitir edição manual de status no detalhe administrativo do pedido
- [x] Permitir cadastro/edição de código de rastreio no detalhe administrativo do pedido

### 9.2 Área do Cliente
- [x] Estruturar navegação real da conta do cliente além do histórico embutido
- [x] Criar página dedicada `/account/orders`
- [x] Criar tela/seção para editar nome
- [x] Criar tela/seção para editar e-mail
- [x] Adicionar captura e edição de `fone/whatsapp`
- [x] Adicionar suporte a endereço principal do cliente
- [x] Criar fluxo de alteração de senha
- [x] Criar fluxo de `esqueci a senha`
- [x] Criar página `/auth/reset-password` e API de redefinição segura por token
- [x] Ajustar `/checkout/success` para apontar para uma rota de pedidos realmente existente

### 9.3 Catálogo Público
- [x] Evoluir `GET /api/products` para suportar paginação
- [x] Evoluir `GET /api/products` para suportar busca por nome
- [x] Evoluir `GET /api/products` para suportar ordenação por `mais recentes`, `menor preço`, `maior preço` e `mais vendidos`
- [x] Evoluir `GET /api/products` para suportar filtro por categoria pai e subcategoria
- [x] Adicionar filtro por tamanho quando aplicável
- [x] Adicionar filtro por sabor quando aplicável
- [x] Atualizar `app/products/page.tsx` para consumir os filtros acima
- [x] Fazer a seção `Mais Vendidos` da home refletir venda real, não apenas `featured`

### 9.4 Admin — Upload e Toggle de Produtos
- [x] Criar `POST /api/admin/upload`
- [x] Permitir upload de múltiplas imagens por produto no admin
- [x] Permitir reordenação simples das imagens no cadastro do produto
- [x] Permitir remoção de imagens já vinculadas ao produto
- [x] Criar `PATCH /api/admin/products/[id]/toggle` ou formalizar ação equivalente dedicada
- [x] Substituir o campo manual de URLs por fluxo de upload real em `ProductsManager`

### 9.5 Integrações Externas
- [x] Integrar Instagram de forma real ou com fallback curado configurável, removendo o mock silencioso atual
- [ ] Validar a integração do Melhor Envio com credenciais de teste/sandbox conforme o PRD
- [ ] Confirmar cálculo de frete nacional com fluxo real do Melhor Envio em ambiente de desenvolvimento
- [x] Validar a integração Stripe com chaves de teste
- [x] Validar criação de checkout, retorno de sucesso/cancelamento e webhook Stripe com ambiente de teste
- [x] Documentar variáveis de ambiente obrigatórias para Instagram, Melhor Envio e Stripe

### 9.6 Home — Seção `Encontre seu Objetivo`
- [x] Tornar a seção dinâmica mantendo sempre 3 cards
- [x] Fazer os cards apontarem para categorias reais do catálogo
- [x] Garantir que o clique leve para `/products` já filtrado pela categoria correspondente
- [x] Remover os cards hardcoded atuais da home

### 9.7 Operação de Loja Física e Pagamentos Manuais
- [x] Definir enums e campos de pedido para `paymentMethod` e `paymentStatus`
- [x] Adicionar suporte a `CASH` no modelo de pedidos
- [x] Adicionar suporte a `MANUAL_PIX` no modelo de pedidos
- [x] Adicionar campos opcionais de pagamento manual (`paidAt`, `manualPaymentReference`, `manualPaymentNotes`, `cashReceivedAmount`, `changeAmount`)
- [x] Garantir separação clara entre status de pagamento e status operacional/logístico do pedido
- [x] Adaptar criação de pedido Stripe para preencher `paymentMethod` e `paymentStatus` corretamente
- [x] Permitir confirmação manual de pagamento no admin
- [x] Permitir registro de valor recebido e troco para vendas em dinheiro
- [x] Permitir exibição/registro de chave Pix e referência para `MANUAL_PIX`
- [x] Garantir que `MANUAL_PIX` não marque pagamento como concluído automaticamente
- [x] Preparar a base para um fluxo simples de PDV/loja física em etapa posterior
- [x] Expandir `paymentMethod` para suportar cartão presencial sem Stripe (`POS_DEBIT` e `POS_CREDIT`)
- [x] Criar tela administrativa dedicada de PDV/balcão para pedidos presenciais
- [x] Permitir busca e adição manual de produtos/variantes em um pedido interno
- [x] Permitir selecionar cliente existente ou registrar venda rápida sem cliente obrigatório
- [x] Permitir finalizar venda presencial com `PICKUP` como fluxo inicial padrão
- [x] Permitir escolher `CASH`, `MANUAL_PIX`, `POS_DEBIT` ou `POS_CREDIT` no fechamento do pedido manual
- [x] Permitir registrar valor recebido, troco, referência Pix e notas diretamente no fluxo de PDV
- [x] Permitir registrar observações e referência operacional para cartão presencial quando necessário
- [x] Criar persistência de pedido manual sem depender do checkout Stripe
- [x] Garantir baixa de estoque consistente no fechamento/confirmacão do pedido presencial
- [x] Garantir que pedidos criados no PDV apareçam corretamente no admin de pedidos
