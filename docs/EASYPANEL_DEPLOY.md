# Deploy no Easypanel

Este projeto esta preparado para deploy em um `App Service` do Easypanel usando o `Dockerfile` versionado no repositorio.

## 1. O que o repositorio ja entrega

- `Dockerfile` multi-stage para Next.js 16 + Prisma
- `next.config.ts` com `output: "standalone"`
- entrypoint que executa `prisma migrate deploy` antes de subir a aplicacao
- `.dockerignore` para manter o build enxuto
- `.env.example` com as variaveis necessarias

## 2. Tipo de servico no Easypanel

Crie um servico do tipo:

- `App`
- source via GitHub
- branch desejada
- build usando o `Dockerfile` do repositorio

Nao e necessario definir comando manual de build ou start no Easypanel.

## 3. Porta da aplicacao

Configure a porta interna:

- `3000`

O container ja sobe o Next.js nessa porta.

## 4. Volume persistente obrigatorio

O projeto salva uploads administrativos em:

- `/app/public/uploads`

No Easypanel, adicione um volume persistente montado exatamente nesse caminho. Sem isso, imagens enviadas pelo admin serao perdidas a cada rebuild ou recriacao do container.

## 5. Variaveis de ambiente minimas

Obrigatorias para o app subir:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/brabus_store?schema=public"
NEXTAUTH_URL="https://seu-dominio.com"
NEXTAUTH_SECRET="gere-um-segredo-forte"
AUTH_TRUST_HOST="true"
PORT="3000"
```

Obrigatorias para checkout Stripe:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_ou_pk_test"
STRIPE_SECRET_KEY="sk_live_ou_sk_test"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES="card"
```

Opcionais por integracao:

```env
MELHOR_ENVIO_TOKEN=""
MELHOR_ENVIO_BASE_URL="https://sandbox.melhorenvio.com.br/api/v2"
INSTAGRAM_ACCESS_TOKEN=""
INSTAGRAM_FALLBACK_POSTS="[]"
```

## 6. Banco de dados

O entrypoint executa automaticamente:

```bash
npx prisma migrate deploy
```

Isso significa que o banco apontado em `DATABASE_URL` precisa estar acessivel pelo container no startup.

Se o banco estiver no proprio Easypanel:

- use a connection string interna entre servicos
- valide acesso de rede entre app e Postgres

## 7. Seed inicial

O deploy nao executa `seed` automaticamente em producao.

Se o banco estiver vazio e voce quiser carregar os dados iniciais, rode manualmente uma unica vez no terminal do servico:

```bash
npx prisma db seed
```

Faça isso apenas em bootstrap inicial de ambiente.

## 8. Ordem recomendada de configuracao

1. Criar/validar o banco PostgreSQL.
2. Configurar `DATABASE_URL`.
3. Configurar dominio publico e `NEXTAUTH_URL`.
4. Configurar `NEXTAUTH_SECRET` e `AUTH_TRUST_HOST=true`.
5. Configurar as credenciais do Stripe.
6. Adicionar volume em `/app/public/uploads`.
7. Fazer o primeiro deploy.
8. Se necessario, executar `npx prisma db seed` uma unica vez.

## 9. Webhook Stripe

Depois que o app estiver publicado, configure o endpoint de webhook da Stripe para:

```text
https://seu-dominio.com/api/stripe/webhook
```

Copie o segredo gerado pela Stripe para `STRIPE_WEBHOOK_SECRET`.

## 10. Observacoes operacionais

- `NATIONAL` continua dependente da homologacao do Melhor Envio.
- `PICKUP` e `LOCAL_DELIVERY` com `CASH` e `MANUAL_PIX` nao dependem da Stripe para criar o pedido.
- o projeto usa Server Components com leitura de banco no shell publico; por isso o layout foi configurado como dinamico para evitar acoplamento indevido do build ao banco.
