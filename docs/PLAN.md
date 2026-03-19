# PLAN — Refatoracao de Catalogo, Variantes e Margem

## 1. Objetivo
Substituir o modelo atual baseado em `ProductType` por um catalogo simples e flexivel com:

- categorias e subcategorias
- atributos dirigidos pela subcategoria
- estoque por variante quando necessario
- preco de custo no produto
- snapshots comerciais no pedido para KPI historico

O foco e aumentar flexibilidade sem introduzir um motor generico de atributos ou uma arvore de categorias sem limite.

## 2. Problemas Do Modelo Atual
Hoje o projeto possui estas limitacoes:

- `Category` e plana, sem hierarquia, em [schema.prisma](/home/jrmelo/Projetos/brabus_store/prisma/schema.prisma#L61).
- `ProductType` controla quais campos aparecem no produto, em vez de a estrutura do catalogo controlar isso, em [schema.prisma](/home/jrmelo/Projetos/brabus_store/prisma/schema.prisma#L74).
- o seed ja usa categorias como se fossem subcategorias, por exemplo `Whey Protein`, `Camisetas`, `Moda Feminina`, `Conjuntos`, em [seed.ts](/home/jrmelo/Projetos/brabus_store/prisma/seed.ts#L64).
- tamanho e sabor sao escolhidos na UI, mas o estoque ainda e unico por produto, em [ProductDetailClient.tsx](/home/jrmelo/Projetos/brabus_store/app/products/[slug]/ProductDetailClient.tsx#L65).
- checkout e webhook validam e decrementam estoque diretamente em `Product.stock`, em [route.ts](/home/jrmelo/Projetos/brabus_store/app/api/checkout/route.ts#L25) e [route.ts](/home/jrmelo/Projetos/brabus_store/app/api/stripe/webhook/route.ts#L58).
- KPI de margem nao e confiavel ao longo do tempo porque o pedido nao captura custo unitario historico.

## 3. Principios Da Nova Modelagem
- hierarquia maxima de 2 niveis: categoria e subcategoria
- produto sempre pertence a uma subcategoria
- subcategoria define quais atributos o produto usa
- estoque vive em variante, nao no produto
- produto simples tambem possui uma variante default
- preco de custo fica no produto nesta fase
- pedido salva snapshots suficientes para historico comercial e KPI
- evitar motor de atributos generico, JSON arbitrario ou regras dinamicas excessivas

## 4. Modelo Proposto

### 4.1 Categoria E Subcategoria
`Category` passa a suportar hierarquia por `parentId`.

Regras:
- categoria pai nao recebe produtos
- subcategoria e a categoria folha que recebe produtos
- profundidade maxima de 2 niveis

Campos novos recomendados:
- `parentId`
- `sortOrder`
- `active`
- `supportsSize`
- `supportsColor`
- `supportsFlavor`
- `supportsWeight`
- `trackStockByVariant`

Esses flags mantem a UI simples: a subcategoria habilita apenas os campos necessarios.

Exemplos de estrutura:
- `Roupas Fitness`
  - `Moda Feminina`
  - `Camisetas`
  - `Conjuntos`
  - `Tops`
- `Acessorios`
  - `Bones`
  - `Luvas`
- `Suplementos`
  - `Creatina`
  - `Whey Protein`
  - `Pre-Treino`
- `Alimentacao Fitness`
  - `Bebida Proteica`
  - `Sucos`
  - `Snacks`

### 4.2 Produto
`Product` deixa de ter `productType` e tambem deixa de carregar estoque operacional.

Campos centrais recomendados:
- `id`
- `name`
- `slug`
- `description`
- `price`
- `costPrice`
- `images`
- `featured`
- `active`
- `isNew`
- `weightLabel`
- `weightKg`
- `categoryId`

Campos removidos ou migrados:
- remover `productType`
- remover `stock`
- mover `sizes`, `flavors` e `color` para variantes ou para opcoes dirigidas pela subcategoria

Observacao:
- `costPrice` no produto e suficiente para a fase atual
- custo por variante fica fora do escopo inicial
- produtos legados sem custo conhecido permanecem com `costPrice = null` ate preenchimento administrativo; nesse periodo, o cadastro continua operavel, mas os KPIs de margem dependem do preenchimento posterior desse campo

### 4.3 Variantes E Estoque
Criar `ProductVariant` como unidade operacional de venda e estoque.

Campos recomendados:
- `id`
- `productId`
- `sku`
- `name`
- `size`
- `color`
- `flavor`
- `stock`
- `active`

Regras:
- todo produto tera ao menos 1 variante
- produto simples usa uma variante default
- roupa normalmente usa variantes por tamanho e opcionalmente cor
- suplemento pode usar variante por sabor quando o estoque precisar ser separado
- se a subcategoria nao exigir separacao real, manter 1 variante default mesmo exibindo opcoes simples na vitrine nao e recomendado; nesses casos a opcao deve nascer como variante

Exemplos:
- Camiseta Dry Fit
  - Preto / P / estoque 4
  - Preto / M / estoque 7
  - Branco / M / estoque 3
- Whey 900g
  - Chocolate / estoque 12
  - Baunilha / estoque 9
- Bone
  - Default / estoque 8

### 4.4 Pedido E Snapshots
`OrderItem` deve continuar referenciando produto, mas tambem precisa congelar os dados comerciais da venda.

Campos novos recomendados em `OrderItem`:
- `productVariantId`
- `productNameSnapshot`
- `productSlugSnapshot`
- `categoryNameSnapshot`
- `subcategoryNameSnapshot`
- `variantNameSnapshot`
- `selectedSize`
- `selectedColor`
- `selectedFlavor`
- `unitPrice`
- `unitCost`

Regras:
- `unitPrice` representa o preco unitario vendido na data
- `unitCost` representa o custo unitario na data
- snapshots de nome/categoria/subcategoria evitam distorcao historica se o catalogo mudar depois

### 4.5 KPI E Margem
Com `price` e `costPrice` no produto, mais `unitPrice` e `unitCost` no pedido, o sistema passa a suportar KPI de margem bruta com consistencia historica.

KPIs habilitados sem complexidade desnecessaria:
- faturamento bruto por produto
- custo total vendido por produto
- lucro bruto por produto
- margem bruta percentual por produto
- faturamento, custo e lucro por categoria
- faturamento, custo e lucro por subcategoria
- ranking de produtos mais rentaveis
- ticket medio
- unidades vendidas por periodo
- valorizacao basica de estoque atual usando `stock` das variantes x `costPrice` do produto

O que ainda fica fora desta fase:
- lucro liquido real
- impostos
- taxa de gateway
- embalagem
- comissoes
- custo logistico por pedido

## 5. Schema Conceitual
Referencia de modelagem esperada:

```prisma
model Category {
  id                   String      @id @default(cuid())
  name                 String
  slug                 String
  parentId             String?
  parent               Category?   @relation("CategoryTree", fields: [parentId], references: [id])
  children             Category[]  @relation("CategoryTree")
  active               Boolean     @default(true)
  sortOrder            Int         @default(0)
  supportsSize         Boolean     @default(false)
  supportsColor        Boolean     @default(false)
  supportsFlavor       Boolean     @default(false)
  supportsWeight       Boolean     @default(false)
  trackStockByVariant  Boolean     @default(true)
  products             Product[]

  @@unique([parentId, slug])
  @@map("categories")
}

model Product {
  id          String           @id @default(cuid())
  name        String
  slug        String           @unique
  description String
  price       Decimal          @db.Decimal(10, 2)
  costPrice   Decimal?         @db.Decimal(10, 2)
  images      String[]
  featured    Boolean          @default(false)
  active      Boolean          @default(true)
  isNew       Boolean          @default(true)
  weightLabel String?
  weightKg    Float?
  categoryId  String
  category    Category         @relation(fields: [categoryId], references: [id])
  variants    ProductVariant[]
  orderItems  OrderItem[]

  @@map("products")
}

model ProductVariant {
  id        String    @id @default(cuid())
  productId String
  product   Product   @relation(fields: [productId], references: [id])
  sku       String?   @unique
  name      String?
  size      String?
  color     String?
  flavor    String?
  stock     Int       @default(0)
  active    Boolean   @default(true)
  orderItems OrderItem[]

  @@map("product_variants")
}

model OrderItem {
  id                      String   @id @default(cuid())
  quantity                Int
  unitPrice               Decimal  @db.Decimal(10, 2)
  unitCost                Decimal? @db.Decimal(10, 2)
  selectedSize            String?
  selectedColor           String?
  selectedFlavor          String?
  productNameSnapshot     String
  productSlugSnapshot     String?
  categoryNameSnapshot    String?
  subcategoryNameSnapshot String?
  variantNameSnapshot     String?
  orderId                 String
  order                   Order    @relation(fields: [orderId], references: [id])
  productId               String
  product                 Product  @relation(fields: [productId], references: [id])
  productVariantId        String?
  productVariant          ProductVariant? @relation(fields: [productVariantId], references: [id])

  @@map("order_items")
}
```

## 6. Decisoes De UX E Admin

### 6.1 Cadastro De Categorias
O admin de categorias deve permitir:
- criar categoria pai
- criar subcategoria vinculada a uma categoria pai
- definir flags de comportamento da subcategoria
- impedir que categoria pai receba produtos diretamente

### 6.2 Cadastro De Produtos
O admin de produtos deve:
- listar categorias agrupadas por pai e subcategoria
- permitir selecao apenas de subcategoria
- exibir campos conforme flags da subcategoria
- exibir editor de variantes quando `trackStockByVariant = true`

Fluxo recomendado:
- passo 1: dados gerais
- passo 2: subcategoria e atributos habilitados
- passo 3: variantes e estoque

### 6.3 Vitrine E PDP
A pagina do produto deve:
- buscar e exibir variantes
- permitir selecao de tamanho/cor/sabor a partir das variantes
- bloquear compra sem variante quando obrigatoria
- mostrar disponibilidade da variante selecionada

### 6.4 Dashboard Admin E KPI
O dashboard administrativo da fase `8.6` deve permanecer simples e leve, organizado em duas abas.

#### Aba 1: Visao Geral
Objetivo:
- oferecer leitura operacional rapida do negocio

Componentes:
- cards no topo com:
  - `Receita Total`
  - `Total de Pedidos`
  - `Pedidos Pendentes`
  - `Alertas de Estoque`
- tabela de ultimos pedidos com:
  - `Id Pedido`
  - `Cliente`
  - `Data`
  - `Valor`
  - `Status`
  - acao de `Visualizar Detalhes`
- paginacao na tabela de pedidos

Regras:
- `Receita Total` deve considerar apenas pedidos em status financeiro valido para receita
- `Pedidos Pendentes` deve considerar pedidos ainda nao concluidos financeiramente
- `Alertas de Estoque` deve usar estoque baixo em variantes, nao apenas `Product.stock`
- a acao de detalhe deve reaproveitar a pagina ja existente do pedido sempre que possivel

#### Aba 2: Acompanhamento Financeiro
Objetivo:
- acompanhar desempenho comercial e margem sem transformar o painel em BI complexo

Componentes:
- cards no topo com:
  - `Faturamento`
  - `Custo`
  - `Lucro Bruto`
  - `Margem`
- grafico de linha para evolucao no tempo
- grafico de barras para categoria e subcategoria
- tabela ou ranking de produtos mais rentaveis

Regras:
- usar `unitPrice` e `unitCost` do `OrderItem` como fonte principal
- priorizar pedidos novos com snapshots completos
- manter granularidade simples por periodo, preferencialmente dia ou mes
- limitar a quantidade inicial de graficos para nao pesar a pagina nem a implementacao
- nao introduzir dependencia de BI nem filtros excessivos nesta fase

## 7. Estrategia De Migracao Segura

### Fase 1. Preparacao
- adicionar novas tabelas e colunas sem remover campos antigos
- manter `productType`, `stock`, `sizes`, `flavors` e `color` temporariamente

### Fase 2. Backfill
- criar categorias pai de primeiro nivel
- transformar categorias atuais em subcategorias
- criar 1 variante default para cada produto existente com o estoque atual
- preencher `costPrice` como `null` inicialmente

### Fase 3. Compatibilidade
- adaptar APIs admin e publicas para lerem variantes e hierarquia de categoria
- manter compatibilidade temporaria com `type`, `ProductType` e `Product.stock`
- preparar payloads para `productVariantId` sem ainda trocar o fluxo de compra

### Fase 4. Fluxo Comercial
- checkout passa a validar variante
- webhook passa a decrementar `ProductVariant.stock`
- pedidos novos passam a salvar snapshots completos
- carrinho e PDP passam a operar com selecao real de variante

### Fase 5. Corte
- remover uso de `Product.stock`
- remover uso de `productType`
- remover arrays legados que foram substituidos por variantes

### Fase 6. Limpeza
- atualizar seed
- revisar filtros, dashboard e paginas publicas
- remover codigo morto

## 8. Regras De Negocio
- categoria pai nao pode ser apagada se tiver subcategorias
- subcategoria nao pode ser apagada se tiver produtos
- produto sem variantes nao pode ficar publicavel
- variante inativa nao pode ser vendida
- estoque nunca pode ficar negativo
- produto inativo bloqueia venda de todas as variantes
- subcategoria define o que e obrigatorio na UI, nao o produto

## 9. Fora Do Escopo Desta Fase
- arvore de categorias ilimitada
- atributos dinamicos arbitrarios por JSON
- preco promocional por variante
- custo por variante
- ERP, nota fiscal ou composicao de custos avancada
- lucro liquido com frete, taxa e imposto

## 10. Resultado Esperado
Ao final desta refatoracao, o sistema deve permitir:

- organizar o catalogo por categoria e subcategoria de forma coerente
- cadastrar roupas, suplementos, acessorios e alimentacao fitness sem depender de `ProductType`
- controlar estoque corretamente por tamanho, cor ou sabor quando necessario
- preservar historico comercial da venda
- medir margem bruta por produto, categoria e subcategoria com consistencia

## 11. Status Atual Da Implementacao
Estado atual do projeto apos as fases executadas nesta sessao:

### Concluido
- Fase 1: `schema.prisma` ampliado de forma incremental, mantendo campos legados ativos durante a transicao.
- Fase 1: migration `add_catalog_phase1` criada e aplicada.
- Fase 2: script de backfill criado para categorias-pai, subcategorias e variantes default.
- Fase 2: `prisma/seed.ts` refeito para nascer com a nova estrutura de catalogo, variantes explicitas e `costPrice`.
- Fase 3: APIs publicas de catalogo atualizadas para retornar `variants`, `subcategory` e `parentCategory`.
- Fase 3: APIs admin de categorias atualizadas para suportar hierarquia simples e flags da subcategoria.
- Fase 3: APIs admin de produtos atualizadas para aceitar payload com variantes e validar uso de subcategoria.
- Fase 3: compatibilidade temporaria mantida para filtros antigos por `type` durante a transicao.
- Fase 4: Admin UI de categorias atualizada para cadastrar categoria pai, subcategoria e flags.
- Fase 4: Admin UI de produtos atualizada para trabalhar com subcategoria, `costPrice` e editor simples de variantes.
- Fase 5: PDP atualizada para selecao real de variante por tamanho, cor e sabor.
- Fase 5: add-to-cart e carrinho atualizados para carregar `productVariantId`, nome de variante e atributos selecionados.
- Fase 5: checkout atualizado para resolver variante, validar estoque por variante e preencher snapshots comerciais no `OrderItem`.
- Fase 5: webhook Stripe atualizado para baixar estoque apenas em `ProductVariant`.
- Fase 5: historico do pedido do cliente passou a priorizar snapshots comerciais e atributos da variante vendida.
- Fase 6: dashboard admin reorganizado em duas abas, `Visao Geral` e `Acompanhamento Financeiro`.
- Fase 6: `Visao Geral` passou a mostrar cards operacionais, tabela paginada de ultimos pedidos e acao de visualizar detalhes.
- Fase 6: `Acompanhamento Financeiro` passou a consumir `unitPrice`, `unitCost` e snapshots historicos para cards, evolucao temporal, barras por categoria/subcategoria e ranking de produtos.
- Fase 6: endpoint `/api/admin/dashboard` passou a reutilizar a mesma agregacao compartilhada da pagina admin.
- Fase 6: detalhe administrativo do pedido foi adicionado para suportar a navegacao da tabela do dashboard.
- Fase 7: navegacao publica da loja deixou de usar filtros por `type` e passou a operar por `category`.
- Fase 7: admin UI de produtos deixou de montar `productType`, `sizes`, `flavors` e `color` como responsabilidade da interface.
- Fase 7: fluxo operacional deixou de ler `Product.stock` como fonte de verdade para venda; o estoque passou a depender apenas de variantes ativas.
- Fase 7: checkout agora trata produto sem variante valida como inconsistencia de catalogo, e o webhook exige `productVariantId` em todos os itens.
- Fase 7: como o sistema ainda nao possui pedidos antigos, os fallbacks operacionais para pedidos legados foram removidos do fluxo comercial.
- Fase 7: migration final `remove_legacy_product_fields` criada e aplicada, removendo do schema e do banco `ProductType`, `Product.stock`, `Product.productType`, `Product.sizes`, `Product.flavors` e `Product.color`.
- Fase 7: `prisma/seed.ts` e os scripts auxiliares foram alinhados ao modelo definitivo baseado em categoria, subcategoria e variantes.

### Estado Atual
- o schema ja opera no modelo final, sem campos legados de produto
- `ProductVariant` e a unica fonte de verdade para estoque operacional
- variacoes de tamanho, cor e sabor existem apenas no nivel de variante
- `costPrice`, `unitPrice` e `unitCost` sustentam os KPIs de margem do dashboard
- a persistencia do carrinho no navegador agora e isolada por usuario autenticado, evitando vazamento de itens entre contas na mesma maquina
- o acesso ao banco no app foi centralizado em singleton Prisma compartilhado, reduzindo abertura excessiva de conexoes durante o desenvolvimento com `next dev`

### Encerramento Do Plano
- a refatoracao principal e a estabilizacao pos-migracao foram concluidas
- a politica para legado financeiro ficou definida como `costPrice = null` ate preenchimento administrativo
- a revisao final de validacoes foi concluida com `npx prisma validate`, `npx tsc --noEmit --pretty false` e `npx eslint app lib components store prisma`
- a validacao final do projeto deve continuar acontecendo de forma recorrente no ciclo normal de desenvolvimento
- o plano de refatoracao de catalogo segue encerrado, mas a revisao cruzada com o `PRD.md` abriu uma nova frente de execucao para cobrir lacunas funcionais ainda nao entregues

### Correcoes Pos-Migracao Prioritarias
Achados da revisao final dos fluxos criticos, com ordem recomendada de execucao:

1. Checkout com entrega nacional sem endereco valido
- problema: a UI ainda envia `address: {}` no checkout e a API aceita pedidos `NATIONAL` sem validar endereco minimo
- risco: gera pedido pago sem endereco expedivel
- correcao proposta:
  - exigir campos obrigatorios de endereco na UI quando `shippingType !== PICKUP`
  - validar no backend `addressStreet`, `addressNumber`, `addressNeighborhood`, `addressCity`, `addressState` e `addressZip` para `NATIONAL` e `LOCAL_DELIVERY`
  - rejeitar a criacao do pedido antes de abrir sessao Stripe se o endereco estiver incompleto
- status: concluido; checkout agora coleta endereco para entrega e a API bloqueia pedidos sem endereco minimo

2. Disponibilidade publica usando estoque agregado de variantes inativas
- problema: o serializer ainda expoe `stock` somando todas as variantes, inclusive inativas, e PDP/add-to-cart usam esse total como fallback visual
- risco: produto parece disponivel, entra no carrinho e falha apenas no checkout
- correcao proposta:
  - calcular estoque agregado publico apenas com variantes `active = true`
  - remover fallback de disponibilidade baseado em total agregado quando nao houver variante vendavel
  - padronizar PDP, cards de produto e botao de compra para refletirem exatamente a mesma regra operacional do checkout
- status: concluido; estoque publico agora soma apenas variantes ativas com estoque, e PDP/add-to-cart deixaram de depender de fallback que mascarava indisponibilidade

3. Checkout UI sem usar o fluxo real de frete do backend
- problema: a UI exibe apenas `PICKUP` e `NATIONAL` com frete fixo, sem usar `LOCAL_DELIVERY`, zonas locais nem calculo nacional
- risco: divergencia entre capacidade real da plataforma e experiencia de compra
- correcao proposta:
  - integrar a tela de checkout com `/api/shipping/local-zones` e `/api/shipping/calculate`
  - habilitar `LOCAL_DELIVERY` quando o CEP/cidade pertencer a zona atendida
  - substituir o frete fixo nacional por cotacao real baseada em peso e destino
  - manter fallback simples apenas quando a integracao externa estiver indisponivel
- status: concluido; checkout agora consulta ViaCEP para autopreenchimento, usa `/api/shipping/local-zones` para entrega local, usa `/api/shipping/calculate` com Melhor Envio para transportadoras nacionais e envia ao backend apenas a selecao do servico
- ajuste adicional: o bloco de CEP/endereco permanece visivel mesmo com `PICKUP` selecionado, para que a entrega local por mototaxi apareca assim que a cidade do Macico for detectada

4. Update de variantes sem escopo forte por produto no admin
- problema: o update de variante no admin usa apenas `id`, sem garantir que a variante pertence ao produto editado
- risco: payload invalido ou malicioso pode alterar variante de outro produto
- correcao proposta:
  - validar que toda variante enviada pertence ao `productId` em edicao antes de atualizar
  - rejeitar ids externos ao produto com erro `400`
  - manter criacao de novas variantes separada de update de variantes existentes
- status: concluido; o endpoint agora valida os `variant.id` recebidos contra as variantes ja vinculadas ao produto e rejeita ids externos com `400`

### Ordem Recomendada
- primeiro: bloquear checkout sem endereco valido
- segundo: alinhar disponibilidade publica com variantes ativas
- terceiro: blindar update de variantes no admin
- quarto: integrar a UI ao fluxo real de frete

### Escopo Formal Da Fase 8.6
A implementacao da fase `8.6 Dashboard e KPI` deve seguir este recorte:

- dashboard com duas abas: `Visao Geral` e `Acompanhamento Financeiro`
- `Visao Geral` com cards operacionais no topo e tabela paginada de ultimos pedidos
- `Acompanhamento Financeiro` com cards financeiros, um grafico de linha, um grafico de barras e ranking de produtos
- experiencia leve, sem excesso de filtros, sem relatorios complexos e sem dependencias desnecessarias

## 12. Lacunas Remanescentes Do PRD
Revisao feita apos o encerramento da refatoracao principal. Esta secao abre uma nova trilha de execucao orientada pelo `PRD.md`, sem reabrir a modelagem ja concluida.

### 12.1 Admin Pedidos
Objetivo:
- concluir o modulo administrativo de pedidos alem do detalhe isolado ja existente

Escopo:
- criar listagem administrativa dedicada de pedidos
- permitir filtro por status
- permitir abertura rapida do detalhe do pedido
- permitir alteracao manual de status
- permitir registro e edicao de `trackingCode`
- expor APIs administrativas correspondentes

Entregas objetivas:
- pagina `app/admin/orders/page.tsx`
- rota `GET /api/admin/orders`
- rota `PATCH /api/admin/orders/[id]/status`
- rota `PATCH /api/admin/orders/[id]/tracking`
- regra de autorizacao admin e validacoes minimas de payload

### 12.2 Conta Do Cliente
Objetivo:
- transformar `/account` em uma area logada completa, nao apenas um historico simples de pedidos

Escopo:
- cadastro e edicao dos dados do cliente
- captura e manutencao de `nome`, `fone/whatsapp`, `email`
- suporte a endereco principal do cliente
- historico de pedidos e detalhe de pedido em rotas consistentes
- fluxo de alteracao de senha
- servico de `esqueci a senha` com token seguro de redefinicao

Decisao de simplificacao:
- manter 1 endereco principal por cliente nesta fase, evitando um modulo complexo de multiplos enderecos

Entregas objetivas:
- tela de dados do cliente
- tela ou secao de alteracao de senha
- pagina dedicada `/account/orders`
- ajuste da navegacao de `/account`
- persistencia de `phone/whatsapp` no modelo do usuario ou perfil associado
- pagina `/auth/forgot-password`
- pagina `/auth/reset-password`
- rotas de solicitacao e confirmacao de reset de senha

Status atual:
- concluido nesta etapa
- o cadastro do cliente agora suporta `nome`, `email`, `fone/whatsapp` e `endereco principal`
- `/account` passou a operar como pagina real de perfil
- `/account/orders` passou a existir como historico dedicado
- a conta agora permite troca de senha autenticada e recuperacao por token seguro
- sem provedor transacional configurado, o `esqueci a senha` expõe o link apenas em desenvolvimento e registra a URL no servidor; a entrega por e-mail real pode ser ligada depois sem refatorar o fluxo

### 12.3 Catalogo Publico
Objetivo:
- alinhar a listagem de produtos com o PRD, mantendo a simplicidade do modelo atual por categoria/subcategoria e variantes

Escopo:
- paginacao publica
- busca por nome
- ordenacao por `mais recentes`, `menor preco`, `maior preco` e `mais vendidos`
- filtro por categoria e subcategoria
- filtro por tamanho quando aplicavel
- filtro por sabor quando aplicavel

Decisoes:
- o filtro legado por `tipo` nao volta; o equivalente passa a ser categoria pai
- `mais vendidos` deve ser derivado de itens vendidos, nao de `featured`

Entregas objetivas:
- evoluir `GET /api/products` com `page`, `search`, `sort`, `category`, `subcategory`, `size`, `flavor`
- atualizar `app/products/page.tsx` para refletir esses filtros
- manter compatibilidade visual com o catalogo baseado em variantes
- alinhar a home para usar venda real na secao `Mais Vendidos`, com fallback operacional para `featured` e `createdAt`

Status atual:
- concluido nesta etapa
- `GET /api/products` agora entrega `items`, `pagination` e `filters`
- a listagem publica passou a suportar paginacao, busca, ordenacao e filtros por categoria pai, subcategoria, tamanho e sabor
- `/products` passou a consumir a resposta paginada da API e renderizar a navegacao publica com esses filtros
- a home deixou de tratar `featured` como fonte primaria de `Mais Vendidos`; o bloco agora prioriza itens com venda real e usa fallback por `featured` e `createdAt` quando ainda nao houver historico suficiente

### 12.4 Upload E Toggle De Produtos
Objetivo:
- substituir o campo manual de URLs por upload real e concluir o controle operacional de ativo/inativo

Escopo:
- upload administrativo de 1 ou mais imagens por produto
- armazenamento simples em `/public/uploads/products/` nesta fase
- reordenacao e remocao basica de imagens no cadastro
- acao dedicada para ativar/desativar produto

Entregas objetivas:
- rota `POST /api/admin/upload`
- suporte a upload multiplo de imagens no admin de produtos
- rota `PATCH /api/admin/products/[id]/toggle` ou acao equivalente formalizada
- manter o cadastro aceitando mais de uma imagem por produto

### 12.5 Integracoes Externas Prioritarias
Objetivo:
- sair do modo parcial/mock e fechar as integracoes obrigatorias do PRD em ambiente de desenvolvimento e homologacao

Escopo:
- Instagram: sair do feed mockado e conectar widget/feed real ou fallback curado configuravel
- Melhor Envio: validar fluxo com credenciais reais de sandbox/teste, cotacao, fallback e cache
- Stripe: validar chaves de teste, checkout, retorno e webhook em ambiente de desenvolvimento

Entregas objetivas:
- documentar variaveis de ambiente obrigatorias
- validar o fluxo completo com credenciais de teste
- registrar claramente quando a integracao usa fallback
- remover dependencia de mock silencioso onde o PRD exige comportamento real

Status atual:
- Stripe Checkout foi endurecido para ambiente de teste, com `card`, `pix` e `boleto`
- o webhook agora trata corretamente pagamentos sincronos e assincronos (`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`)
- a tela de sucesso deixou de assumir `pagamento aprovado` para Pix e boleto antes da confirmacao do webhook
- o Stripe CLI ja esta instalado localmente
- a validacao ponta a ponta com Stripe real segue pendente porque o `.env` ainda usa chaves placeholder (`pk_test_...`, `sk_test_...`, `whsec_...`)

### 12.6 Home — Secao `Encontre Seu Objetivo`
Objetivo:
- tornar a secao dinamica, mantendo o limite visual de 3 cards e ligando cada card a categorias reais do catalogo

Escopo:
- cards alimentados por categorias/subcategorias reais
- clique levando para `/products` ja filtrado pela categoria correspondente
- manter a experiencia leve, sem CMS ou configurador complexo nesta fase

Decisao de simplificacao:
- sempre exibir 3 cards
- priorizar categorias pai ativas com melhor ordem configurada
- se necessario, usar fallback para as 3 principais categorias do seed ate o admin ganhar ordenacao editorial dedicada

Entregas objetivas:
- fonte de dados dinamica para os 3 cards
- links consistentes com a pagina filtrada de produtos
- remocao dos cards hardcoded atuais

### 12.7 Operacao De Loja Fisica E Pagamentos Manuais
Objetivo:
- permitir que a plataforma opere tambem como apoio a vendas presenciais, sem depender exclusivamente do Stripe para concluir um pedido

Escopo:
- manter Stripe como meio de pagamento online automatizado
- adicionar meios de pagamento manuais para operacao interna:
  - dinheiro
  - Pix manual por chave Pix da loja
  - cartao presencial sem Stripe
- garantir que pagamentos manuais nao sejam marcados como pagos automaticamente sem confirmacao operacional quando isso for necessario

Diretriz de produto:
- pagamento online e pagamento presencial/manual devem coexistir, mas com fluxos claramente separados
- o checkout publico continua priorizando pagamentos online
- a operacao de loja fisica usa pedido manual, status controlado e confirmacao operacional

Modelo recomendado:
- introduzir um conceito explicito de metodo de pagamento no pedido
- introduzir um status de pagamento separado do status logistico/comercial do pedido
- permitir registrar informacoes adicionais para pagamento manual, sem acoplar isso ao Stripe

Estrutura funcional sugerida:
- `paymentMethod`
  - `STRIPE_CARD`
  - `STRIPE_PIX` quando a conta Stripe suportar Pix
  - `CASH`
  - `MANUAL_PIX`
  - `POS_DEBIT`
  - `POS_CREDIT`
- `paymentStatus`
  - `PENDING`
  - `PAID`
  - `FAILED`
  - `CANCELLED`
  - `REFUNDED`
- campos complementares opcionais no pedido
  - `paidAt`
  - `manualPaymentReference`
  - `manualPaymentNotes`
  - `cashReceivedAmount`
  - `changeAmount`

Regras operacionais:
- `CASH`
  - pode ser marcado como pago no ato da venda presencial
  - pode registrar valor recebido e troco
- `MANUAL_PIX`
  - deve exibir a chave Pix da loja
  - nao deve marcar o pedido como pago automaticamente
  - exige confirmacao manual no admin ou no fluxo de PDV antes de liberar como `PAID`
- `POS_DEBIT` e `POS_CREDIT`
  - representam pagamento em maquineta/balcao, fora do Stripe
  - podem ser confirmados manualmente no ato da venda
  - podem registrar observacoes e referencia operacional quando necessario
- `STRIPE_*`
  - continua seguindo confirmacao automatica por webhook

Decisao de escopo:
- nesta frente, o objetivo principal e habilitar a operacao interna e omnichannel
- a primeira entrega foi concluida no admin/PDV e no modelo de pedidos
- a segunda etapa imediata passa a ser a exposicao controlada de `dinheiro` e `Pix manual` no checkout publico apenas para `PICKUP` e `LOCAL_DELIVERY`
- o checkout publico nacional continua dependente de Stripe

Entregas objetivas:
- evoluir schema de pedidos para comportar metodo e status de pagamento
- adaptar criacao e detalhe de pedido para pagamentos manuais
- permitir confirmacao manual de pagamento no admin
- permitir registrar observacoes e referencia de pagamento manual
- preparar a base para um fluxo de PDV simples para loja fisica

Status atual:
- o modelo de pedidos ja suporta `paymentMethod`, `paymentStatus`, `paidAt`, referencia/notas manuais e valores de caixa/troco
- o checkout online e o webhook Stripe ja preenchem os campos de pagamento de forma consistente
- o admin de pedidos ja permite confirmar pagamento manual, registrar Pix manual, dinheiro, valor recebido, troco e observacoes
- a chave Pix da loja ja pode ser cadastrada no admin e exibida no detalhe do pedido
- a separacao entre status operacional e status de pagamento ja esta implementada
- o PDV ja suporta `CASH`, `MANUAL_PIX`, `POS_DEBIT` e `POS_CREDIT` com persistencia consistente e baixa de estoque controlada

Proxima entrega explicita:
- expor `CASH` e `MANUAL_PIX` no checkout publico de forma controlada para `PICKUP` e `LOCAL_DELIVERY`, sem quebrar o fluxo atual do Stripe

Escopo detalhado do checkout publico local:
- adicionar selecao de forma de pagamento no checkout publico
- manter `STRIPE_CARD` como opcao principal online
- permitir `MANUAL_PIX` e `CASH` apenas quando `shippingType` for `PICKUP` ou `LOCAL_DELIVERY`
- bloquear `MANUAL_PIX` e `CASH` para `NATIONAL`
- exibir chave Pix da loja no fluxo publico quando `MANUAL_PIX` for escolhido
- permitir informar valor em maos para `CASH` quando isso fizer sentido operacionalmente
- criar pedido manual publico sem abrir sessao Stripe
- reaproveitar a base de validacao e persistencia ja usada pelo PDV, evitando duplicacao de regra de negocio
- exibir tela de confirmacao com instrucoes especificas por metodo de pagamento e CTA para WhatsApp

Regras do checkout publico local:
- `STRIPE_CARD`
  - continua funcionando como hoje
  - segue criando sessao Stripe e depende de webhook para confirmacao
- `MANUAL_PIX`
  - cria pedido com `paymentMethod = MANUAL_PIX`
  - nasce com `paymentStatus = PENDING`
  - nao deve marcar pagamento como concluido automaticamente
  - deve exibir instrucoes, chave Pix e CTA para WhatsApp na confirmacao
- `CASH`
  - cria pedido com `paymentMethod = CASH`
  - nasce com `paymentStatus = PENDING`
  - pode registrar `cashReceivedAmount` e `changeAmount` quando o cliente informar valor em maos
  - deve exibir instrucoes de retirada/entrega e CTA para WhatsApp na confirmacao
- `NATIONAL`
  - continua restrito aos meios suportados pelo Stripe

Regra recomendada de estoque para a fase:
- manter o comportamento atual do Stripe: baixa de estoque apenas quando houver confirmacao real
- pedidos publicos `MANUAL_PIX` e `CASH` criados como `PENDING` nao devem baixar estoque automaticamente na criacao
- a baixa para esses pedidos deve acontecer no momento da confirmacao manual de pagamento no admin
- risco aceito desta fase: possibilidade de overselling em pedidos manuais pendentes, sem mecanismo de reserva temporaria

Decisoes tecnicas recomendadas:
- evitar mudanca de schema nesta etapa; o modelo atual ja suporta o fluxo
- evoluir `POST /api/checkout` para aceitar `paymentMethod`
- bifurcar o fluxo de checkout:
  - Stripe -> cria sessao como hoje
  - manual -> cria pedido e retorna payload de confirmacao
- extrair a criacao de pedido manual para um servico compartilhado em `lib/`, reutilizavel entre checkout publico e PDV
- reutilizar `StoreSettings.pixKey` como fonte unica da chave Pix da loja

Fora de escopo desta etapa:
- QR Code Pix dinamico
- conciliacao automatica de comprovante
- reserva temporaria de estoque com expiracao
- meios manuais para `NATIONAL`

Entregas objetivas da proxima etapa:
- adicionar UI de forma de pagamento ao checkout publico
- adaptar validacao do frontend para combinar entrega e metodo de pagamento
- adaptar `POST /api/checkout` para criar pedidos manuais publicos
- criar servico compartilhado para persistencia de pedido manual
- ajustar `/checkout/success` para instrucoes especificas de `MANUAL_PIX` e `CASH`
- manter compatibilidade integral com o fluxo Stripe ja existente
- validar ponta a ponta `PICKUP` e `LOCAL_DELIVERY` com `MANUAL_PIX` e `CASH`
### 12.8 Ordem Recomendada De Execucao
1. Admin Pedidos
2. Conta do Cliente
3. Catalogo publico com paginacao, busca e filtros
4. Upload multiplo e toggle de produtos
5. Integracao Stripe com chaves de teste
6. Integracao Melhor Envio com credenciais de teste/sandbox
7. Integracao Instagram
8. Home dinamica na secao `Encontre Seu Objetivo`
9. Operacao de loja fisica com `CASH` e `MANUAL_PIX`
