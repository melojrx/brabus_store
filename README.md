# Brabus Performance Store

E-commerce full stack da Brabus Performance Store, focado em suplementacao, moda fitness e operacao omnichannel entre loja fisica, WhatsApp, Instagram e venda online.

O projeto foi construido com Next.js App Router, TypeScript, Prisma, PostgreSQL, NextAuth e Stripe, com uma camada administrativa para catalogo, pedidos, frete, configuracoes e PDV de balcao.

## Visao Geral

A proposta da plataforma e entregar uma experiencia de compra moderna para clientes de todo o Brasil, com prioridade operacional para o Ceara e para a regiao do Macico de Baturite. Alem do e-commerce, o sistema cobre rotinas de operacao local como retirada em loja, entrega propria, gestao administrativa de pedidos e vendas presenciais.

Documentos de referencia do projeto:

- [PRD.md](./PRD.md)
- [docs/PLAN.md](./docs/PLAN.md)
- [TASKS.md](./TASKS.md)

## Principais Funcionalidades

- Catalogo publico com categorias, subcategorias, busca, ordenacao e filtros por variante.
- Pagina de produto com selecao real de variantes, controle de estoque e adicao ao carrinho.
- Carrinho persistido no cliente com Zustand.
- Checkout autenticado com Stripe, retirada em loja, entrega local e calculo de frete nacional.
- Autenticacao com credenciais usando NextAuth.
- Area do cliente com perfil, historico de pedidos, detalhe do pedido, alteracao de senha e reset de senha por token.
- Painel administrativo com dashboard comercial e financeiro.
- CRUD administrativo de produtos, categorias, imagens, variantes, estoque, zonas de entrega e configuracoes da loja.
- Gestao administrativa de pedidos com filtros, atualizacao de status, rastreio e controle de pagamento.
- PDV interno para vendas presenciais com `CASH`, `MANUAL_PIX`, `POS_DEBIT` e `POS_CREDIT`.
- Integracao com feed do Instagram via token real ou fallback curado.
- Estrutura preparada para operacao com Melhor Envio e validacao de integracoes via script.

## Estado Atual do Projeto

O repositorio esta em estado funcional para desenvolvimento local e cobre o escopo principal do MVP. Hoje, o codigo implementa:

- Loja publica, checkout e area autenticada do cliente.
- Painel admin com KPIs, operacao de pedidos, catalogo e PDV.
- Stripe em ambiente de teste com webhook.
- Frete local por zonas cadastradas.
- Frete nacional via Melhor Envio com integracao no codigo e validacao remota ainda pendente de homologacao ponta a ponta.
- Feed do Instagram por Graph API ou fallback configuravel.

Pontos que ainda exigem confirmacao operacional:

- homologacao final do Melhor Envio em ambiente de desenvolvimento/homologacao
- validacao ponta a ponta com credenciais reais do ambiente desejado

## Stack Tecnologica

### Aplicacao

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Framer Motion
- Lucide React

### Backend e Dados

- PostgreSQL 16
- Prisma 5
- NextAuth 5 beta
- Zod
- bcryptjs
- Zustand

### Pagamentos e Integracoes

- Stripe
- Melhor Envio
- Instagram Graph API

## Arquitetura do Projeto

```text
app/            rotas, paginas e handlers da App Router
components/     componentes compartilhados da interface
lib/            regras de negocio, integracoes e utilitarios
store/          estado global do cliente
prisma/         schema, migrations e seed
public/         arquivos estaticos e uploads
docs/           planejamento e documentacao complementar
types/          tipos globais e extensoes
scripts/        scripts operacionais e de validacao
```

## Modelagem de Dominio

O modelo atual reflete a refatoracao de catalogo e margem planejada em [docs/PLAN.md](./docs/PLAN.md):

- `Category` com hierarquia simples de categoria pai e subcategoria
- `Product` com preco, custo, imagens e relacionamento com categoria
- `ProductVariant` como unidade real de venda e estoque
- `Order` com status operacional, entrega e pagamento
- `OrderItem` com snapshots comerciais para historico financeiro consistente
- `LocalDeliveryZone` para frete proprio regional
- `StoreSettings` para dados publicos e operacionais da loja

## Fluxos Cobertos

### Loja

- home com destaque comercial e categorias dinamicas
- listagem de produtos com filtros e paginacao
- detalhe do produto com escolha de variante
- carrinho e checkout
- paginas institucionais como loja fisica e contato

### Cliente

- cadastro e login
- perfil
- meus pedidos
- detalhe do pedido
- alterar senha
- esqueci minha senha e redefinicao por token

### Administracao

- dashboard geral e financeiro
- catalogo de produtos e categorias
- upload e ordenacao de imagens
- zonas de entrega local
- configuracoes da loja
- fila e detalhe de pedidos
- PDV de balcao

## Setup Local

### 1. Instale as dependencias

```bash
npm install
```

### 2. Suba o banco local

```bash
docker compose up -d db
```

### 3. Configure o `.env`

Use as variaveis listadas na secao de ambiente abaixo.

### 4. Gere o client do Prisma

```bash
npm run prisma:generate
```

### 5. Rode as migrations

```bash
npx prisma migrate dev
```

### 6. Popule a base com seed inicial

```bash
npx prisma db seed
```

### 7. Inicie a aplicacao

```bash
npm run dev
```

Aplicacao local:

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Variaveis de Ambiente

Exemplo base:

```env
DATABASE_URL="postgresql://brabus_admin:brabus_password@localhost:5432/brabus_store?schema=public"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me"

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxxx"
STRIPE_SECRET_KEY="sk_test_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES="card"
STRIPE_FORWARD_URL="http://localhost:3000/api/stripe/webhook"

MELHOR_ENVIO_TOKEN="me_xxxxx"
MELHOR_ENVIO_BASE_URL="https://sandbox.melhorenvio.com.br/api/v2"

INSTAGRAM_ACCESS_TOKEN=""
INSTAGRAM_FALLBACK_POSTS='[]'

PORT="3000"
```

### Obrigatorias para subir o projeto

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

### Obrigatorias para checkout Stripe

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Opcionais por integracao

- `STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES`
- `STRIPE_FORWARD_URL`
- `MELHOR_ENVIO_TOKEN`
- `MELHOR_ENVIO_BASE_URL`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_FALLBACK_POSTS`
- `PORT`

## Credenciais Iniciais do Seed

O seed cria um usuario administrador padrao para facilitar o bootstrap local:

- Email: `admin@brabus.com`
- Senha: `Admin@123`

Use essas credenciais apenas em ambiente local e altere-as conforme sua rotina de desenvolvimento.

## Scripts Uteis

```bash
npm run dev
npm run build
npm run start
npm run lint -- .
npm run prisma:generate
npm run integrations:check
npm run stripe:listen
```

### O que cada script faz

- `npm run dev`: inicia a aplicacao em desenvolvimento
- `npm run build`: valida o build de producao
- `npm run start`: inicia a aplicacao em modo de producao apos o build
- `npm run lint -- .`: executa a analise estatica com ESLint
- `npm run prisma:generate`: regenera o Prisma Client
- `npm run integrations:check`: testa o estado configurado de Stripe, Melhor Envio e Instagram
- `npm run stripe:listen`: encaminha eventos locais do Stripe CLI para o webhook da aplicacao

## Integracoes

### Stripe

- checkout implementado
- criacao de sessao implementada
- webhook implementado
- fluxo de teste validado no projeto

### Melhor Envio

- calculo de frete nacional implementado
- fallback para ambiente sandbox configuravel
- depende de token e homologacao operacional para validacao final

### Instagram

- suporte a feed real pela Graph API
- fallback curado por variavel de ambiente quando nao houver token

## Qualidade e Validacao

O projeto ainda nao possui uma suite automatizada versionada. No estado atual, o baseline de validacao recomendado e:

- `npm run lint -- .`
- `npm run build`
- verificacao manual dos fluxos alterados
- `npm run integrations:check` quando houver mudancas em Stripe, Melhor Envio ou Instagram

## Roadmap Proximo

- concluir homologacao ponta a ponta do Melhor Envio
- ampliar cobertura automatizada de testes
- endurecer documentacao de deploy e operacao
- evoluir observabilidade e validacoes operacionais

## Deploy

O projeto foi pensado para deploy em VPS com EasyPanel, mantendo:

- Next.js como aplicacao principal
- PostgreSQL como banco persistente
- variaveis de ambiente para Stripe, Melhor Envio, NextAuth e Instagram
- webhook Stripe acessivel publicamente

## Licenca

Este projeto nao utiliza a licenca MIT e, neste momento, nao possui uma licenca publica aberta declarada no repositorio.

## Desenvolvedor

<table>
  <tr>
    <td width="120" align="center">
      <img src="https://github.com/melojrx.png" width="96" alt="Junir Melo" />
    </td>
    <td>
      <strong>Junir Melo</strong><br />
      GitHub: <a href="https://github.com/melojrx">melojrx</a><br />
      Email: <a href="mailto:jrmeloafrf@gmail.com">jrmeloafrf@gmail.com</a><br />
      Desenvolvido com ☕ e ❤️ por Junior Melo para Brabus Performance Store.
    </td>
  </tr>
</table>
