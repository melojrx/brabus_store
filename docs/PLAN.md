# Plano de Implementacao
## Brabu's Performance Store

---

**Documento:** Plano de Implementacao e Ordem de Evolucao  
**Versao:** 2.0  
**Data:** Marco de 2026  
**Documento de origem:** `docs/PRD.md`  
**Documento operacional:** `docs/TASKS.md`

---

## 1. Objetivo do documento

Este documento define:

- o estado atual consolidado da plataforma;
- as frentes de evolucao ativas do projeto;
- as decisoes de dominio que impactam a implementacao;
- o backlog estrutural priorizado;
- a ordem recomendada de execucao das proximas entregas.

Este arquivo deve ser tratado como a referencia principal do que vamos implementar e em que sequencia.

---

## 2. Contexto do projeto

A Brabu's Performance Store opera como um e-commerce omnichannel com:

- loja publica;
- checkout online;
- area autenticada do cliente;
- painel administrativo;
- PDV para operacao presencial;
- integracoes com Stripe, Melhor Envio e Instagram.

O repositorio ja superou o estagio inicial de MVP tecnico. A fase atual e de evolucao operacional, consolidacao de regras de negocio e ampliacao de capacidades administrativas.

---

## 3. Estado atual consolidado

Hoje a plataforma ja entrega:

- catalogo com categorias, subcategorias e variantes;
- estoque por variante;
- area do cliente com pedidos, perfil e senha;
- admin com produtos, categorias, pedidos, dashboard, clientes, entrega e configuracoes;
- PDV de balcao com pagamentos manuais e cartao presencial;
- checkout publico com Stripe, retirada, entrega local e calculo nacional;
- webhook Stripe com sincronizacao financeira e regra de estoque;
- dashboard inicial de KPIs comerciais e financeiros.

Capacidades ja estabilizadas:

- refatoracao do catalogo e da margem;
- snapshots comerciais no pedido;
- controle de pagamento separado do status operacional;
- baixa e reposicao de estoque conforme transicao financeira;
- fluxo administrativo de pedidos;
- fluxo basico de venda presencial no PDV.

Pontos ainda dependentes de consolidacao operacional:

- homologacao final do Melhor Envio;
- go-live formal do Stripe em producao;
- refinamento da jornada de compra;
- governanca de cadastros mestres e perfis de acesso;
- amadurecimento do PDV e da camada fiscal.

---

## 4. Frentes de evolucao

O backlog futuro do projeto esta organizado em tres frentes permanentes.

### 4.1 Aplicacao Geral

Foco:

- robustez operacional;
- identidade visual final;
- instalabilidade;
- readiness de producao.

Escopo desta frente:

- PWA instalavel;
- Stripe 100% funcional em producao;
- dark/light mode;
- identidade visual final da marca;
- favicon, logo e slogan reais;
- homologacao final do Melhor Envio.

### 4.2 Site e Vendas Online

Foco:

- conversao;
- preservacao do contexto de compra;
- previsibilidade do checkout;
- clareza da jornada.

Escopo desta frente:

- merge de carrinho entre visitante e usuario autenticado;
- continuidade da jornada ao entrar ou cadastrar;
- redirect controlado para o carrinho;
- revisao de linguagem do carrinho e checkout;
- limpeza de endereco e frete ao trocar contexto;
- reorganizacao da ordem do checkout;
- refinamento da experiencia publica de pagamentos manuais locais.

### 4.3 Admin e Operacao

Foco:

- produtividade do time operacional;
- cadastros mestres;
- governanca de acesso;
- PDV avancado;
- fiscal;
- leitura gerencial.

Escopo desta frente:

- sidebar recolhivel;
- feedbacks de CRUD;
- busca, filtros, paginacao e exportacao no admin;
- dashboard e KPIs ampliados;
- clientes, vendedores, fornecedores e usuarios;
- permissoes por perfil;
- metodos configuraveis do PDV;
- regras de fiado e excecao de estoque;
- codigo do produto, barcode e cupom fiscal;
- IA assistida para descricao de produtos.

---

## 5. Decisoes de dominio relevantes

### 5.1 Catalogo e estoque

Decisao vigente:

- produto pertence a subcategoria;
- estoque operacional vive em variante;
- snapshots comerciais ficam congelados no pedido;
- custo historico e margem usam `unitPrice` e `unitCost`.

Impacto:

- dashboard, exportacao, barcode e codigo do produto devem respeitar a estrutura produto + variante.

### 5.2 Pedido, pagamento e estoque

Decisao vigente:

- `paymentStatus` e `status` operacional sao independentes;
- baixa de estoque acontece no evento financeiro correto;
- reposicao ocorre em cancelamento ou reembolso quando aplicavel;
- pedido deve registrar `channel/origin` automaticamente no momento da criacao.

Impacto:

- PDV avancado, fiado, metodos configuraveis e fiscal precisam respeitar essa separacao;
- dashboard gerencial passa a separar com precisao vendas `ONLINE`, `PDV` e historico `LEGACY`.

Decisao operacional complementar:

- pedidos criados no checkout publico devem nascer com canal `ONLINE`;
- pedidos criados no PDV administrativo devem nascer com canal `PDV`;
- pedidos antigos sem rastreabilidade formal devem ser tratados como `LEGACY` ate saneamento posterior.

### 5.3 Cliente x usuario do sistema

Estado atual:

- `User` ainda acumula papeis de cliente autenticado e identidade de acesso.

Decisao necessaria para a proxima fase:

- separar melhor `cliente` de `usuario do sistema`, porque nem todo cliente precisara de credencial e nem todo perfil operacional e cliente.

Impacto:

- CRUD de clientes;
- CRUD de usuarios;
- vendedores;
- permissoes;
- fiado;
- cupom fiscal.

### 5.4 Perfis e permissoes

Estado atual:

- o sistema trabalha essencialmente com `ADMIN` e `CUSTOMER`.

Decisao alvo:

- suportar pelo menos:
  - `ADMIN`
  - `usuario comum`
  - `vendedor`

Impacto:

- auth;
- guards server-side;
- menus;
- operacoes do admin;
- acoes do PDV.

### 5.5 PDV e meios de pagamento

Estado atual:

- o PDV opera com metodos fixos em codigo:
  - `CASH`
  - `MANUAL_PIX`
  - `POS_DEBIT`
  - `POS_CREDIT`

Decisao alvo:

- evoluir para camada configuravel de metodos operacionais do PDV, sem quebrar a consistencia do dominio de pedidos.

### 5.6 Fiscal

Estado atual:

- nao existe emissao fiscal integrada.

Decisao alvo:

- implementar emissao de cupom fiscal conforme modelo homologado pela area negocial, apos definicao formal de estrategia tecnica.

---

## 6. Backlog de evolucao por dominio

### 6.1 Aplicacao Geral

- PWA instalavel com `manifest`, icones e fallback offline minimo
- checklist de producao do Stripe
- validacao ponta a ponta do Stripe em producao
- dark/light mode real
- identidade visual final da marca
- favicon, logo e slogan oficiais
- homologacao final do Melhor Envio

### 6.2 Site e Vendas Online

- merge de carrinho visitante + usuario
- continuidade da jornada de autenticacao no checkout
- redirect pos-adicao ao carrinho
- revisao de microcopy da jornada de compra
- reset inteligente de endereco e frete
- reorganizacao estrutural do checkout
- consolidacao do checkout publico local com pagamentos manuais
- benchmark de UX com referencia no pipeline do Mercado Livre

### 6.3 Admin e Operacao

- sidebar recolhivel
- feedbacks positivos de CRUD
- tabela de produtos com scroll horizontal correto
- busca, filtros e paginacao no admin de produtos
- exportacao da lista de produtos para Excel
- campo `codigo do produto`
- dashboard ampliada com filtros e novos indicadores
- dashboard reorganizada por abas:
  - visao geral
  - financeiro
  - comercial
  - estoque
- separacao gerencial entre vendas online, PDV e legado
- QR Code para Pix manual conforme estrategia aprovada
- CRUD de clientes
- CPF/CNPJ no cadastro de cliente
- inscricao estadual para PJ
- CRUD de vendedores
- CRUD de fornecedores
- CRUD de usuarios no admin
- esquema de permissoes por perfil
- CRUD de metodos de pagamento do PDV
- venda fiado com cliente obrigatorio
- venda com estoque zerado ou negativo sob regra controlada
- leitura de codigo de barras no cadastro e na venda
- cupom fiscal conforme modelo homologado
- IA assistida para descricao de produtos
- frete local por perimetro/distancia

---

## 7. Mapa de complexidade

### 7.1 Baixa a media complexidade

- merge de carrinho
- continuidade do fluxo de login/cadastro
- redirect para carrinho
- revisao de microcopy
- reset de endereco e frete
- reorganizacao do checkout
- sidebar recolhivel
- feedbacks de CRUD
- scroll horizontal de tabela
- busca, filtros e paginacao no admin
- evolucao inicial da dashboard
- checklist de go-live do Stripe
- homologacao operacional do Melhor Envio

### 7.2 Media complexidade

- PWA instalavel
- dark/light mode
- identidade visual final
- QR de Pix manual
- exportacao de produtos para Excel
- campo `codigo do produto`

### 7.3 Alta complexidade

- separacao entre cliente e usuario do sistema
- CRUD de clientes com documento fiscal
- CRUD de usuarios
- CRUD de vendedores
- CRUD de fornecedores
- permissoes por perfil
- metodos configuraveis do PDV
- fiado
- venda com estoque negativo
- barcode
- cupom fiscal
- IA assistida para descricao
- frete por perimetro/distancia

---

## 8. Ordem recomendada de implementacao

### Fase 1 — Conversao e operacao imediata

- dashboard com filtro de periodo e KPIs ampliados
- merge de carrinho e continuidade de autenticacao
- reorganizacao do checkout
- admin de produtos com busca, filtros, paginacao e feedbacks
- sidebar do admin
- ergonomia inicial do PDV
- checklist de go-live do Stripe
- homologacao do Melhor Envio

### Fase 2 — Maturidade visual e operacional media

- PWA
- dark/light mode
- identidade visual final
- QR de Pix manual
- codigo do produto
- exportacao para Excel

### Fase 3 — Governanca, cadastros mestres e PDV avancado

- separar cliente e usuario
- CRUD de clientes
- CPF/CNPJ e inscricao estadual
- CRUD de usuarios
- permissoes
- CRUD de vendedores
- CRUD de fornecedores
- metodos configuraveis do PDV
- fiado
- venda com estoque negativo

### Fase 4 — Fiscal e operacao avancada

- barcode
- cupom fiscal
- IA assistida
- frete local por perimetro/distancia

---

## 9. Dependencias criticas

- a dashboard depende da consolidacao das agregacoes em `lib/admin-dashboard.ts`
- merge de carrinho depende de ajuste fino em `store/cartStore.ts` e sincronizacao com sessao
- admin de produtos com busca/filtro/paginacao depende de listagem server-side
- cliente x usuario deve ser resolvido antes do CRUD final de usuarios e clientes
- permissoes dependem de revisao do modelo de auth
- metodos configuraveis do PDV impactam pedidos, dashboard e validacoes
- fiado depende de definicao do dominio financeiro
- cupom fiscal depende de modelo homologado e possivel integracao externa

---

## 10. Fora de escopo atual

Nao pertencem ao escopo deste repositorio, neste momento:

- Buscador de Oportunidades
- pipeline de proposta
- perfil com IA fora do dominio de e-commerce
- sugestao de palavras-chave para perfil comercial

---

## 11. Regra de governanca documental

- `docs/PRD.md` define a visao de produto e os requisitos
- `docs/PLAN.md` define o que vamos implementar e a ordem recomendada
- `docs/TASKS.md` e a fonte da verdade operacional para sprints e acompanhamento continuo
