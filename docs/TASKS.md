# Tasks de Implementacao
## Brabu's Performance Store

---

**Documento:** Tasks de Implementacao e Acompanhamento Continuo  
**Versao:** 2.0  
**Data:** Marco de 2026  
**Referencias:** `docs/PRD.md` | `docs/PLAN.md`

---

## 1. Objetivo do documento

Este documento e a fonte da verdade operacional do projeto. Aqui ficam:

- entregas ja concluidas;
- sprints ativas de evolucao;
- tasks executaveis por sprint;
- criterios de aceite e validacao;
- backlog posterior ainda nao puxado para execucao.

---

## 2. Regras de uso

- `- [x]` significa entrega concluida e consolidada
- `- [ ]` significa task planejada e ainda nao concluida
- as sprints devem refletir o planejamento ativo
- novas demandas devem entrar primeiro no `docs/PLAN.md` e depois ser puxadas para a sprint adequada neste arquivo
- documentos paralelos de sprint nao devem ser mantidos como fonte concorrente

---

## 3. Visao geral das sprints

| Sprint | Foco | Complexidade | Status |
|---|---|---|---|
| Historico Consolidado | Fundacao + MVP + estabilizacao entregue | Concluida | Concluida |
| Sprint 1 | Conversao, dashboard e operacao imediata | Baixa a media | Em andamento |
| Sprint 1.5 | Cadastros mestres (Customer, Seller, Supplier) | Media-alta | Concluida |
| Sprint 1.6 | Role SELLER, CRUD usuarios, vendedor no PDV | Media-alta | Concluida |
| Sprint 2 | Maturidade visual e operacional media | Media | Planejada |
| Sprint 3 | Governanca, cadastros mestres e PDV avancado | Alta | Planejada |

---

## 4. Historico consolidado de entregas concluidas

**Objetivo:** preservar a rastreabilidade do que ja foi implementado antes da formalizacao do modelo atual de sprints.

### 4.1 Fundacao do projeto

- [x] Inicializar projeto Next.js 15 com TypeScript
- [x] Instalar dependencias principais do projeto
- [x] Configurar Tailwind CSS, fontes e base visual
- [x] Configurar `docker-compose.yml` para PostgreSQL local
- [x] Criar `.env` inicial
- [x] Centralizar Prisma Client em singleton compartilhado

### 4.2 Banco, catalogo e modelagem comercial

- [x] Criar `prisma/schema.prisma` base
- [x] Definir enums principais
- [x] Criar `seed` inicial detalhado
- [x] Rodar migrations e seed local
- [x] Refatorar catalogo para categorias pai e subcategorias
- [x] Introduzir `costPrice` em produto
- [x] Introduzir `ProductVariant` com estoque operacional
- [x] Evoluir `OrderItem` com snapshots comerciais
- [x] Gerar variante default para produtos legados
- [x] Aplicar corte final removendo campos legados de produto

### 4.3 APIs e backend principal

- [x] Implementar auth com credenciais
- [x] Implementar APIs publicas de produtos e categorias
- [x] Implementar CRUD admin de produtos e categorias
- [x] Implementar checkout e webhook Stripe
- [x] Implementar calculo de frete e zonas locais
- [x] Implementar APIs de dashboard, configuracoes e Instagram

### 4.4 Loja publica

- [x] Implementar layout principal da loja
- [x] Implementar `Navbar`, `Footer` e botao de WhatsApp
- [x] Implementar home da loja
- [x] Implementar listagem de produtos com filtros e paginacao
- [x] Implementar pagina de detalhe do produto com variantes
- [x] Implementar paginas institucionais da loja fisica e contato

### 4.5 Carrinho, checkout e conta do cliente

- [x] Implementar carrinho com Zustand e persistencia local
- [x] Implementar pagina `/cart`
- [x] Implementar checkout com autenticacao
- [x] Implementar entrega por retirada, local e nacional
- [x] Implementar telas de sucesso e cancelamento
- [x] Isolar carrinho por usuario autenticado no mesmo navegador
- [x] Implementar area do cliente com pedidos e perfil
- [x] Implementar alteracao de senha e fluxo de reset

### 4.6 Admin e operacao

- [x] Implementar painel admin com layout dedicado
- [x] Implementar dashboard inicial
- [x] Implementar gestao de produtos, categorias e entrega
- [x] Implementar tela e fluxo de pedidos administrativos
- [x] Implementar upload real de imagens
- [x] Implementar toggle administrativo de produtos
- [x] Implementar feed do Instagram real ou com fallback

### 4.7 Dashboard inicial e margem

- [x] Estruturar dashboard em abas
- [x] Exibir cards de visao geral
- [x] Exibir cards financeiros
- [x] Exibir serie temporal inicial
- [x] Exibir graficos por categoria e subcategoria
- [x] Exibir ranking financeiro de produtos
- [x] Basear indicadores em snapshots historicos

### 4.8 Operacao de loja fisica e pagamentos manuais

- [x] Definir `paymentMethod` e `paymentStatus`
- [x] Adicionar `CASH` e `MANUAL_PIX`
- [x] Adicionar campos complementares de pagamento manual
- [x] Separar status financeiro de status operacional
- [x] Adaptar Stripe para preencher metodo e status de pagamento
- [x] Permitir confirmacao manual de pagamento no admin
- [x] Permitir dinheiro, troco, referencia Pix e observacoes
- [x] Expandir para `POS_DEBIT` e `POS_CREDIT`
- [x] Criar PDV administrativo dedicado
- [x] Permitir busca e adicao manual de produtos no PDV
- [x] Permitir selecionar cliente existente ou venda rapida
- [x] Permitir concluir pedido manual sem depender do checkout Stripe
- [x] Garantir baixa de estoque coerente no PDV
- [x] Garantir que pedidos do PDV aparecam no admin

### 4.9 Estabilizacao pos-migracao

- [x] Bloquear checkout sem endereco para entregas que exigem endereco
- [x] Validar disponibilidade publica por variante ativa vendavel
- [x] Integrar checkout com zonas locais
- [x] Integrar checkout com calculo nacional
- [x] Expor `LOCAL_DELIVERY` quando houver zona aplicavel
- [x] Tratar reposicao de estoque em cancelamento e reembolso

---

## 5. Sprint 1 — Conversao, Dashboard e Operacao Imediata

**Objetivo:** atacar friccoes imediatas de compra e operacao, enquanto a dashboard passa a refletir leitura comercial real do negocio.

**Status da sprint:** Em andamento

### 5.1 Aplicacao Geral

#### TASK-S1-APP-01 — Checklist de homologacao do Mercado Pago em sandbox

- [ ] Mapear variaveis obrigatorias do Mercado Pago para sandbox e producao
- [ ] Revisar fluxo atual de criacao de preferencia/pagamento Mercado Pago
- [ ] Revisar webhook atual e documentar eventos obrigatorios do Mercado Pago
- [ ] Validar matriz de estados:
  - [ ] `PENDING -> PAID`
  - [ ] `PENDING -> FAILED`
  - [ ] `PAID -> REFUNDED`
  - [ ] `PAID -> CANCELLED`
- [ ] Validar ponta a ponta em sandbox antes de planejar go-live de producao
- [ ] Atualizar documentacao operacional de homologacao e producao

#### TASK-S1-APP-02 — Homologacao ponta a ponta do Melhor Envio

- [ ] Validar token e base URL por ambiente
- [ ] Validar calculo de frete com CEPs reais de teste
- [ ] Validar comportamento sem servicos disponiveis
- [ ] Revisar mensagens de erro do checkout
- [ ] Atualizar documentacao de homologacao

### 5.2 Site e Vendas Online

#### TASK-S1-STORE-01 — Merge de carrinho entre visitante e usuario

- [ ] Definir regra de merge entre carrinho `guest` e carrinho autenticado
- [ ] Ajustar sincronizacao ao trocar `ownerKey`
- [ ] Tratar itens duplicados por variante
- [ ] Respeitar limite de estoque durante merge

#### TASK-S1-STORE-02 — Continuidade da jornada de login e cadastro

- [x] Revisar `callbackUrl` no login
- [ ] Revisar fluxo de cadastro para retorno ao checkout
- [ ] Exibir feedback claro de continuidade da jornada
- [ ] Validar manualmente login e cadastro com carrinho existente

#### TASK-S1-STORE-03 — Redirect pos-adicao ao carrinho

- [ ] Revisar comportamento atual do `AddToCartButton`
- [ ] Implementar redirect para `/cart` apos adicao bem-sucedida
- [ ] Preservar selecao obrigatoria de variante quando aplicavel

#### TASK-S1-STORE-04 — Revisao de microcopy da jornada

- [ ] Revisar textos de `/cart`
- [ ] Revisar textos de `/checkout`
- [ ] Revisar labels de botoes e resumos
- [ ] Remover termos em ingles desnecessarios

#### TASK-S1-STORE-05 — Reset inteligente de endereco e frete

- [x] Limpar transportadora selecionada ao trocar CEP
- [ ] Limpar resultados de frete ao trocar contexto do endereco
- [x] Limpar feedbacks de frete quando necessario
- [ ] Impedir reutilizacao silenciosa de frete de outro endereco

#### TASK-S1-STORE-06 — Reordenacao estrutural do checkout

- [ ] Colocar CEP e endereco primeiro
- [ ] Exibir frete depois do endereco
- [ ] Posicionar resumo antes do pagamento
- [ ] Revisar validacoes e responsividade da nova ordem

#### TASK-S1-STORE-07 — Checkout publico local com pagamentos manuais

- [x] Expor selecao de forma de pagamento no checkout publico
- [x] Manter `NATIONAL` restrito ao fluxo Stripe
- [x] Permitir `STRIPE_CARD`, `MANUAL_PIX` e `CASH` para `PICKUP`
- [x] Permitir `STRIPE_CARD`, `MANUAL_PIX` e `CASH` para `LOCAL_DELIVERY`
- [x] Exibir chave Pix da loja quando `MANUAL_PIX` for selecionado
- [x] Permitir informar valor em maos para `CASH`
- [x] Evoluir `POST /api/checkout` para aceitar `paymentMethod`
- [x] Bifurcar fluxo entre sessao Stripe e criacao de pedido manual
- [x] Extrair servico compartilhado de criacao de pedido manual
- [x] Criar pedidos manuais publicos com `paymentStatus = PENDING`
- [x] Garantir que pedidos `MANUAL_PIX` e `CASH` nao baixem estoque na criacao
- [x] Garantir baixa na confirmacao manual no admin
- [x] Ajustar `/checkout/success` para `MANUAL_PIX`
- [x] Ajustar `/checkout/success` para `CASH`
- [x] Adicionar CTA de WhatsApp na confirmacao
- [ ] Validar ponta a ponta `PICKUP` com `MANUAL_PIX`
- [ ] Validar ponta a ponta `PICKUP` com `CASH`
- [ ] Validar ponta a ponta `LOCAL_DELIVERY` com `MANUAL_PIX`
- [ ] Validar ponta a ponta `LOCAL_DELIVERY` com `CASH`
- [ ] Validar que o fluxo Stripe permanece intacto

### 5.3 Admin e Operacao

#### TASK-S1-ADMIN-01 — Sidebar recolhivel no admin

- [x] Definir estado de recolhimento
- [x] Implementar trigger de recolher/expandir
- [x] Preservar navegacao acessivel
- [x] Revisar comportamento em telas menores

#### TASK-S1-ADMIN-02 — Feedbacks positivos de CRUD

- [x] Definir padrao visual unico para feedbacks de sucesso
- [x] Aplicar em produtos
- [x] Aplicar em categorias
- [x] Aplicar em zonas de entrega
- [x] Aplicar em configuracoes

#### TASK-S1-ADMIN-03 — Tabela de produtos com scroll horizontal correto

- [x] Ajustar container da tabela para `overflow-x`
- [x] Preservar alinhamento de colunas e acoes
- [x] Validar uso em viewport reduzida

#### TASK-S1-ADMIN-04 — Busca no admin de produtos

- [x] Definir busca server-side
- [x] Adicionar campo de busca na tela
- [x] Suportar busca por nome
- [x] Suportar busca por slug
- [x] Avaliar suporte inicial por SKU

#### TASK-S1-ADMIN-05 — Filtros no admin de produtos

- [x] Adicionar filtro por status ativo/inativo
- [x] Adicionar filtro por categoria pai
- [x] Adicionar filtro por subcategoria
- [x] Adicionar filtro por destaque
- [x] Refletir filtros em query e resposta

#### TASK-S1-ADMIN-06 — Paginacao no admin de produtos

- [x] Paginar consulta server-side
- [x] Adicionar metadados de paginacao
- [x] Implementar controles de pagina no frontend
- [x] Preservar busca e filtros entre paginas

#### TASK-S1-ADMIN-07 — Ergonomia inicial do PDV

- [x] Revisar ordem de cliente, produtos, entrega, pagamento e pedido atual
- [x] Reduzir necessidade de voltar entre secoes
- [x] Revisar labels, feedbacks e estados de conclusao

#### TASK-S1-ADMIN-08 — Reorganizacao da navegacao do admin

- [x] Reordenar fluxo principal para `Dashboard`, `PDV` e `Pedidos`
- [x] Agrupar `Cadastros` com `Produtos`, `Categorias`, `Clientes` e `Usuarios`
- [x] Agrupar `Configuracoes` com `Geral` e `Entregas`
- [x] Reposicionar a acao de sair no fluxo principal da sidebar

#### TASK-S1-ADMIN-09 — Acoes operacionais na listagem de pedidos

- [x] Substituir botao textual de visualizar por acao com icone e tooltip
- [x] Adicionar atalho de cancelamento diretamente na tabela
- [x] Criar endpoint dedicado para cancelamento administrativo
- [x] Cancelar pagamento e devolver estoque quando aplicavel
- [x] Bloquear cancelamento por alteracao manual simples de status

#### TASK-S1-ADMIN-10 — Codigo publico legivel do pedido

- [x] Separar `id` tecnico de `orderNumber` publico
- [x] Definir formato `PREFIXO-YYMMDD-NNNN`
- [x] Implementar contador diario por canal
- [x] Aplicar o codigo publico em admin, checkout e area do cliente
- [x] Documentar a estrategia em `docs/ORDER_NUMBERING.md`

### 5.4 Dashboard e KPI

#### TASK-S1-DASH-01 — Filtro global de periodo

- [x] Definir opcoes iniciais de periodo
- [x] Refletir filtro na URL
- [x] Adaptar agregacoes para respeitar o periodo selecionado
- [x] Garantir consistencia entre cards, graficos e rankings
- [x] Adicionar recorte `Hoje`
- [x] Definir `7 dias` como periodo padrao da dashboard

#### TASK-S1-DASH-02 — Novos cards principais

- [x] Adicionar `Lucro Total`
- [x] Adicionar `Margem de Lucro`
- [x] Adicionar `Total em Vendas`
- [x] Adicionar `Quantidade de Produtos Cadastrados`
- [x] Adicionar `Total em R$ de Estoque`
- [x] Reorganizar indicadores por dominio:
  - [x] visao geral
  - [x] financeiro
  - [x] comercial
  - [x] estoque

#### TASK-S1-DASH-03 — Valor total em estoque

- [x] Agregar `stock atual x costPrice`
- [x] Definir politica para produtos sem custo
- [x] Exibir regra de calculo de forma clara

#### TASK-S1-DASH-03B — Canal/origem do pedido para leitura gerencial

- [x] Adicionar campo de canal/origem no dominio de `Order`
- [x] Preencher `ONLINE` no checkout publico
- [x] Preencher `PDV` no fluxo administrativo de balcao
- [x] Tratar pedidos historicos como `LEGACY`
- [x] Expor canal/origem para a dashboard gerencial

#### TASK-S1-DASH-04 — Grafico de faturamento vs lucro bruto

- [x] Adicionar pontos por periodo
- [x] Exibir valores por ponto
- [x] Adicionar hover com tooltip nos pontos
- [x] Responder ao filtro global de periodo
- [x] Validar legibilidade em desktop e mobile

#### TASK-S1-DASH-05 — Grafico de vendas por dia, mes e ano

- [x] Implementar agregacao diaria
- [x] Implementar agregacao mensal
- [x] Implementar agregacao anual
- [x] Exibir o grafico coerente com a granularidade escolhida

#### TASK-S1-DASH-06 — Receitas por tipo de pagamento

- [x] Agregar pedidos validos por `paymentMethod`
- [x] Definir nomes amigaveis para exibicao
- [x] Exibir visualizacao comparativa

#### TASK-S1-DASH-07 — Vendas por categoria e subcategoria

- [x] Trocar agregacao de lucro por agregacao de vendas
- [x] Manter separacao entre categoria pai e subcategoria
- [x] Revisar labels e ordenacao dos graficos

#### TASK-S1-DASH-08 — Produtos mais vendidos

- [x] Agregar unidades vendidas por produto
- [x] Ordenar por quantidade
- [x] Exibir faturamento quando fizer sentido

#### TASK-S1-DASH-09 — Top clientes

- [x] Definir criterio inicial de ranking
- [x] Agregar clientes do periodo
- [x] Tratar corretamente cliente de PDV/balcao quando necessario

#### TASK-S1-DASH-10 — Estrutura final das abas da dashboard

- [x] Aba `Visao Geral` com cards de vendas totais, total de pedidos, R$ em estoque e produtos cadastrados
- [x] Aba `Visao Geral` com grafico de vendas por periodo
- [x] Aba `Visao Geral` com grafico de vendas por metodo de pagamento
- [x] Aba `Financeiro` mantendo cards e leituras financeiras detalhadas
- [x] Aba `Comercial` com KPI de total de vendas
- [x] Aba `Comercial` com graficos de metodo de pagamento, categoria, subcategoria e canal
- [x] Aba `Estoque` com KPIs de alertas, valor total em estoque e produtos cadastrados
- [x] Aba `Estoque` com visualizacao de top produtos

#### Proximo bloco recomendado da Sprint 1

- [x] Priorizar `TASK-S1-DASH-08 — Produtos mais vendidos` ✅
- [x] Em seguida puxar `TASK-S1-DASH-09 — Top clientes` ✅
- [ ] Depois consolidar validacoes pendentes da Sprint 1

### 5.5 Validacao da Sprint 1

- [ ] Rodar `npm run lint -- .`
- [x] Rodar `npm run build`
- [ ] Validar login/cadastro com carrinho existente
- [ ] Validar mudanca de CEP e limpeza de frete
- [ ] Validar busca, filtros e paginacao no admin de produtos
- [ ] Validar recolhimento da sidebar
- [ ] Validar fluxo revisado do PDV
- [x] Validar dashboard com filtro de periodo

---

## 5.6 Sprint 1.5 — Cadastros Mestres

**Objetivo:** separar o conceito de cliente comercial do usuario do sistema, criar entidades independentes de vendedores e fornecedores, e preparar a base para governanca futura sem quebrar fluxos existentes.

**Status da sprint:** Concluida

**Estrategia:** Customer como model separado com relacao 1:1 opcional para User. Order.userId nao muda. Seller e Supplier como models independentes.

### TASK-S1.5-01 — Model Customer separado de User

- [x] Criar model `Customer` com CPF, CNPJ, tipo pessoa, inscricao estadual, endereco, notas
- [x] Criar relacao 1:1 opcional `Customer.userId -> User.id`
- [x] Criar migration com data migration (Users CUSTOMER -> Customers)
- [x] Manter `Order.userId` inalterado (zero breaking changes)

### TASK-S1.5-02 — Models Seller e Supplier

- [x] Criar model `Seller` (nome, email, phone, CPF, notas)
- [x] Criar model `Supplier` (nome, email, phone, CPF, CNPJ, tipo pessoa, inscricao estadual, contato, endereco, notas)
- [x] Ambos independentes de User

### TASK-S1.5-03 — Helpers de validacao e formatacao

- [x] `validateCpf` / `validateCnpj` com validacao de digitos
- [x] `formatCpf` / `formatCnpj` para exibicao
- [x] `cleanDocument` para limpeza de input
- [x] `serializeCustomer` / `serializeSeller` / `serializeSupplier`

### TASK-S1.5-04 — CRUD Admin de Clientes

- [x] `GET /api/admin/customers` com busca, filtros (personType, active), paginacao
- [x] `POST /api/admin/customers` com validacao de CPF/CNPJ e unicidade
- [x] `GET /api/admin/customers/[id]`
- [x] `PATCH /api/admin/customers/[id]`
- [x] `DELETE /api/admin/customers/[id]` (soft delete)
- [x] Pagina admin com formulario completo, tabela, busca, filtros, paginacao

### TASK-S1.5-05 — CRUD Admin de Vendedores

- [x] `GET /api/admin/sellers` com busca e paginacao
- [x] `POST /api/admin/sellers` com validacao de CPF
- [x] `PATCH /api/admin/sellers/[id]`
- [x] `DELETE /api/admin/sellers/[id]` (soft delete)
- [x] Pagina admin com formulario, tabela, busca

### TASK-S1.5-06 — CRUD Admin de Fornecedores

- [x] `GET /api/admin/suppliers` com busca e paginacao
- [x] `POST /api/admin/suppliers` com validacao de CPF/CNPJ
- [x] `PATCH /api/admin/suppliers/[id]`
- [x] `DELETE /api/admin/suppliers/[id]` (soft delete)
- [x] Pagina admin com formulario completo, tabela, busca

### TASK-S1.5-07 — Navegacao e integracao

- [x] Adicionar Vendedores e Fornecedores na sidebar do admin (secao Cadastros)
- [x] Atualizar PDV customer search para buscar em Customer em vez de User
- [x] Manter compatibilidade: PDV retorna userId para criacao de Order

### TASK-S1.5-08 — Integration API de Clientes

- [x] `GET /api/v1/integrations/customers` com scope `read:customers`
- [x] `GET /api/v1/integrations/customers/[id]` com scope `read:customers`
- [x] Adicionar scope `read:customers` na UI de API keys

### Impacto em fluxos existentes

- [x] Checkout publico: nenhuma alteracao
- [x] Stripe webhook: nenhuma alteracao
- [x] Account area: nenhuma alteracao
- [x] PDV orders: busca migrada para Customer, Order.userId preservado
- [x] Admin orders: nenhuma alteracao
- [x] Dashboard: nenhuma alteracao
- [x] Build: zero erros, zero warnings

---

## 5.7 Sprint 1.6 — Role SELLER e CRUD de Usuarios

**Objetivo:** permitir que vendedores tenham login proprio para operar o PDV com governanca. Registrar automaticamente quem vendeu em cada pedido.

**Status da sprint:** Concluida

### TASK-S1.6-01 — Role SELLER no schema

- [x] Adicionar `SELLER` ao enum Role
- [x] Adicionar `mustChangePassword` ao User
- [x] Adicionar `Seller.userId` (1:1 opcional com User)
- [x] Adicionar `Order.sellerId` (quem vendeu)
- [x] Migration aplicada

### TASK-S1.6-02 — Auth guard centralizado

- [x] Criar `lib/auth-guard.ts` com `isStaffRole()`
- [x] Atualizar todos os guards de API admin (~20 arquivos)
- [x] Atualizar `proxy.ts` para aceitar SELLER no admin
- [x] Atualizar `app/admin/layout.tsx`
- [x] Atualizar types `next-auth.d.ts`

### TASK-S1.6-03 — PDV registra vendedor

- [x] PDV busca Seller vinculado ao User logado
- [x] Passa `sellerId` para `createManualOrder`
- [x] Order gravado com vendedor automaticamente

### TASK-S1.6-04 — CRUD de Usuarios no admin

- [x] `GET /api/admin/users` com busca, filtro por role, paginacao
- [x] `POST /api/admin/users` com senha temporaria gerada
- [x] `PATCH /api/admin/users/[id]` (nome, email, phone, role)
- [x] `DELETE /api/admin/users/[id]` (desativa: role -> CUSTOMER)
- [x] `POST /api/admin/users/[id]/reset-password` (nova senha temporaria)
- [x] Pagina admin com UsersManager
- [x] Senha exibida uma unica vez (padrao API key)
- [x] Se role=SELLER, cria Seller vinculado automaticamente

### TASK-S1.6-05 — Troca de senha obrigatoria

- [x] `mustChangePassword` no token JWT e session
- [x] `proxy.ts` redireciona para `/admin/change-password` se flag ativa
- [x] Pagina de troca de senha (sem exigir senha atual)
- [x] `POST /api/admin/change-password` seta flag false
- [x] Apos trocar, redireciona para login (refresh de session)

### TASK-S1.6-06 — Navegacao

- [x] Ativar item "Usuarios" na sidebar (remover disabled)
- [x] Account page mostra link admin para SELLER tambem

---

## 6. Sprint 2 — Maturidade Visual e Operacional Media

**Objetivo:** elevar a maturidade visual e operacional sem entrar ainda nas grandes refatoracoes de cadastros mestres e permissoes.

**Status da sprint:** Planejada

### 6.1 Aplicacao Geral

#### TASK-S2-APP-01 — PWA instalavel

- [x] Criar `manifest`
- [x] Definir icones
- [x] Configurar metadados de instalacao
- [x] Definir fallback offline minimo
- [ ] Validar instalacao em navegadores suportados
- [x] Documentar a implementacao em `docs/PWA.md`

#### TASK-S2-APP-02 — Dark/light mode

- [ ] Definir estrategia de tokens
- [ ] Remover acoplamentos mais fortes ao dark mode fixo
- [ ] Adicionar seletor de tema
- [ ] Persistir preferencia do usuario
- [ ] Revisar componentes principais nos dois temas

#### TASK-S2-APP-03 — Identidade visual final

- [ ] Incorporar favicon real
- [ ] Incorporar logo real
- [ ] Incorporar slogan real
- [ ] Revisar header, footer e telas principais

### 6.2 Admin e Operacao

#### TASK-S2-ADMIN-01 — Campo codigo do produto

- [ ] Definir nivel do campo: produto, variante ou ambos
- [ ] Atualizar schema e migration
- [ ] Incluir o campo no admin de produtos
- [ ] Exibir o codigo na listagem administrativa

#### TASK-S2-ADMIN-02 — Exportacao de produtos para Excel

- [ ] Definir colunas da exportacao inicial
- [ ] Criar endpoint ou acao de exportacao
- [ ] Gerar arquivo compativel com Excel
- [ ] Respeitar filtros ativos da listagem

#### TASK-S2-ADMIN-03 — QR Code para Pix manual

- [ ] Validar estrategia aprovada pela area negocial
- [ ] Definir origem dos dados do QR
- [ ] Exibir QR no checkout publico quando aplicavel
- [ ] Exibir QR no detalhe do pedido quando aplicavel
- [ ] Avaliar exibicao no PDV, se fizer sentido

### 6.3 Validacao da Sprint 2

- [ ] Rodar `npm run lint -- .`
- [ ] Rodar `npm run build`
- [ ] Validar exportacao real para Excel
- [ ] Validar PWA em desktop e mobile
- [ ] Validar alternancia de tema

---

## 7. Sprint 3 — Governanca, Cadastros Mestres e PDV Avancado

**Objetivo:** abrir a camada estrutural de governanca operacional, cadastros mestres, PDV avancado e frente fiscal.

**Status da sprint:** Planejada

### 7.1 Cadastros Mestres e Governanca

#### TASK-S3-GOV-01 — Revisao de modelo entre cliente e usuario

- [x] Definir modelo alvo entre `Customer` e `User` (resolvido na Sprint 1.5)
- [x] Mapear impacto em pedidos, checkout, conta do cliente e PDV
- [x] Definir estrategia de migracao sem perda de historico

#### TASK-S3-GOV-02 — CRUD de clientes no admin

- [x] Criar modelagem final de cliente (Sprint 1.5)
- [x] Criar APIs de listagem, criacao, edicao e exclusao
- [x] Criar tela administrativa com busca e filtros
- [x] Permitir cliente sem acesso ao sistema

#### TASK-S3-GOV-03 — Documento fiscal do cliente

- [x] Adicionar `CPF/CNPJ`
- [x] Adicionar tipo de pessoa
- [x] Exigir `inscricao estadual` para `CNPJ`
- [x] Validar mascaras e regras de obrigatoriedade

#### TASK-S3-GOV-04 — CRUD de usuarios no admin

- [x] Criar tela e APIs de usuarios (Sprint 1.6)
- [x] Permitir criacao de `admin`
- [x] Permitir criacao de `vendedor`
- [x] Revisar fluxo de senha e ativacao (senha temporaria + mustChangePassword)

#### TASK-S3-GOV-05 — Esquema de permissoes

- [x] Definir matriz inicial de acessos (SELLER = ADMIN, Sprint 1.6)
- [x] Revisar middleware e guards server-side (isStaffRole centralizado)
- [x] Revisar exibicao condicional de menus e acoes
- [ ] Validar restricoes granulares no admin e no PDV (futuro, se necessario)

#### TASK-S3-GOV-06 — CRUD de vendedores

- [x] Definir se vendedor e tipo de usuario, cadastro proprio ou ambos (model independente, Sprint 1.5)
- [x] Criar CRUD de vendedores
- [x] Preparar vinculacao futura com vendas (sellerId no Order, Sprint 1.6)

#### TASK-S3-GOV-07 — CRUD de fornecedores

- [x] Definir modelagem de fornecedor (Sprint 1.5)
- [x] Criar CRUD de fornecedores
- [ ] Preparar vinculacao futura com produtos e compras

### 7.2 PDV avancado

#### TASK-S3-PDV-01 — CRUD de metodos de pagamento do PDV

- [ ] Definir convivencia ou substituicao do enum atual
- [ ] Criar cadastro administrativo de metodos
- [ ] Permitir ativar e inativar metodo
- [ ] Permitir definir regras operacionais por metodo

#### TASK-S3-PDV-02 — Regra de venda fiado

- [ ] Definir representacao do `fiado` no dominio financeiro
- [ ] Exigir cliente cadastrado ou selecionado
- [ ] Revisar persistencia e status financeiro
- [ ] Revisar impacto em dashboard e contas a receber

#### TASK-S3-PDV-03 — Venda com estoque zerado ou negativo

- [ ] Definir estrategia de excecao controlada
- [ ] Revisar validacoes de quantidade no PDV
- [ ] Registrar auditoria minima da excecao
- [ ] Revisar impacto em indicadores de estoque

#### TASK-S3-PDV-04 — Leitura de codigo de barras

- [ ] Definir campo e regra de unicidade/compatibilidade
- [ ] Permitir captura manual e por scanner no cadastro
- [ ] Permitir uso do barcode na venda/PDV

### 7.3 Fiscal

#### TASK-S3-FISCAL-01 — Emissao de cupom fiscal

- [ ] Receber e documentar o modelo fiscal homologado
- [ ] Definir estrategia tecnica de emissao
- [ ] Mapear dados obrigatorios do pedido, cliente e empresa
- [ ] Revisar impacto em PDV, pedidos e fechamento

### 7.4 Catalogo assistido por IA

#### TASK-S3-AI-01 — Descricao de produto assistida por IA

- [ ] Permitir cadastro focado em fotos + nome
- [ ] Integrar geracao assistida de descricao
- [ ] Revisar aprovacao humana antes da publicacao
- [ ] Documentar custo, fallback e limites

### 7.5 Validacao da Sprint 3

- [ ] Rodar `npm run lint -- .`
- [ ] Rodar `npm run build`
- [ ] Validar CRUDs administrativos criados
- [ ] Validar perfis e permissoes por rota e por acao
- [ ] Validar regras de fiado e venda com estoque negativo
- [ ] Validar fluxo homologado de cupom fiscal

---

## 8. Backlog posterior ainda nao puxado para sprint

- [ ] Benchmark aprofundado do pipeline de compra com referencia externa
- [ ] Evolucao do frete local por perimetro/distancia
- [ ] Futuras integracoes fiscais ou financeiras adicionais

---

## 9. Dependencias transversais

- cliente x usuario precisa ser resolvido antes do CRUD final de clientes e usuarios
- metodos configuraveis do PDV impactam pedidos, dashboard e validacoes
- fiado depende da definicao do dominio financeiro
- cupom fiscal depende de modelo homologado e possivel integracao externa
- barcode depende da decisao sobre `codigo do produto` e identificacao de variante

---

## 10. Historico de reorganizacao documental

- [x] Consolidar `EVOLUTION_SPRINTS.md` e documentos `SPRINT_X_TASKS.md` em `docs/TASKS.md`
- [x] Redefinir `docs/PLAN.md` como documento estrategico e de ordem de implementacao
- [x] Preservar entregas historicas concluidas em secao propria
