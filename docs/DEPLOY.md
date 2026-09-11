# Deploy em VPS com NGINX

Este projeto roda em VPS propria usando Docker Compose, NGINX e GitHub Actions via SSH. EasyPanel nao faz parte do fluxo operacional atual.

## 1. Fluxo atual

```text
push em main
  -> GitHub Actions: .github/workflows/deploy.yml
  -> SSH na VPS root@38.52.128.62
  -> /srv/apps/brabustore/deploy.sh
  -> git fetch + reset --hard origin/main
  -> docker compose build --pull app
  -> docker compose up -d --force-recreate --no-deps app
  -> scripts/docker-entrypoint.sh (wrapper)
  -> scripts/docker-migrate.sh
  -> scripts/docker-start.sh
  -> health check em http://127.0.0.1:3001/api/health
  -> NGINX publica https://brabustore.com.br
```

## 2. Arquivos ativos

| Arquivo | Papel |
|---|---|
| `.github/workflows/deploy.yml` | Dispara deploy em push para `main` e permite `workflow_dispatch` |
| `deploy.sh` | Script executado na VPS para atualizar codigo, buildar imagem, recriar app e validar health |
| `docker-compose.vps.yml` | Compose de producao com `app`, `db` e volumes persistentes |
| `Dockerfile` | Build multi-stage do Next.js standalone |
| `scripts/docker-entrypoint.sh` | Wrapper de compatibilidade da VPS: migration + servidor |
| `scripts/docker-start.sh` | Inicia somente `node server.js` (usado pelo Swarm) |
| `scripts/docker-migrate.sh` | Executa somente `npx prisma migrate deploy` (job do Swarm) |
| `infra/nginx/brabustore.conf` | Configuracao de referencia do NGINX |

## 3. VPS de producao

| Item | Valor |
|---|---|
| Host | `root@38.52.128.62` |
| Path | `/srv/apps/brabustore` |
| Compose | `docker-compose.vps.yml` |
| Env | `.env.production` |
| Porta interna publicada | `127.0.0.1:3001 -> app:3000` |
| Dominio | `https://brabustore.com.br` |
| Health | `https://brabustore.com.br/api/health` |

## 4. Deploy automatico

Todo push em `main` dispara o workflow, exceto quando todos os arquivos alterados batem em `paths-ignore`:

```yaml
paths-ignore:
  - '**.md'
  - 'docs/**'
  - '.gitignore'
```

Commits apenas documentais nao fazem deploy, por design.

Para acompanhar:

```bash
gh run list --branch main --limit 10
gh run view <run-id> --log
```

## 5. Deploy manual ou redeploy

Use o mesmo script versionado da VPS:

```bash
ssh root@38.52.128.62
cd /srv/apps/brabustore
./deploy.sh
```

Se o codigo local da VPS ja estiver no mesmo commit e voce precisar reconstruir/recriar o container:

```bash
FORCE=1 ./deploy.sh
```

## 6. Banco e migrations

Na VPS, o wrapper de compatibilidade ainda executa automaticamente:

```bash
npx prisma migrate deploy
```

Isso acontece no startup do app via `scripts/docker-entrypoint.sh`, mantendo o
fluxo atual da VPS. No Homelab, o serviço web chama apenas
`scripts/docker-start.sh`; o controlador executa `scripts/docker-migrate.sh`
como job one-shot antes de atualizar o web.

Validacao em producao:

```bash
ssh root@38.52.128.62
cd /srv/apps/brabustore
docker compose -f docker-compose.vps.yml --env-file .env.production exec app npx prisma migrate status
```

## 7. Validacao pos-deploy

Depois de um deploy, valide:

```bash
curl -I https://brabustore.com.br/api/health
curl -I -L https://brabustore.com.br/admin/pdv

ssh root@38.52.128.62
cd /srv/apps/brabustore
git rev-parse --short HEAD
docker compose -f docker-compose.vps.yml --env-file .env.production ps
docker compose -f docker-compose.vps.yml --env-file .env.production logs --tail=80 app
docker compose -f docker-compose.vps.yml --env-file .env.production exec app npx prisma migrate status
```

Resultado esperado:

- `/api/health` retorna HTTP 200.
- `/admin/pdv` redireciona para login quando nao ha sessao.
- `git rev-parse --short HEAD` aponta para o commit esperado.
- o container `brabustore-app-1` esta `Up`.
- `prisma migrate status` retorna `Database schema is up to date!`.

## 8. Volumes persistentes

O Compose de producao mantem:

- `postgres_data` em `/var/lib/postgresql/data` no container do banco.
- `uploads` montado em `/app/public/uploads` no container da aplicacao.

Nao remova esses volumes durante deploy normal.

## 9. Seed inicial

O deploy nao executa seed automaticamente. Se um ambiente novo precisar de dados iniciais:

```bash
docker compose -f docker-compose.vps.yml --env-file .env.production exec app npx prisma db seed
```

Use apenas em bootstrap inicial ou tarefa operacional explicitamente planejada.

## 10. Homelab (fluxo preparado)

O fluxo alvo usa Docker Swarm no nó `homelab`, a rede externa `edge` do
Traefik e a rede privada `brabustore_backend`. O PostgreSQL não publica porta;
uploads e dados usam volumes nomeados próprios da Brabus.

Arquivos versionados:

| Arquivo | Papel |
|---|---|
| `deploy/swarm/brabustore.yml` | Serviços web, PostgreSQL, migration e scheduler |
| `deploy/swarm/brabustore-edge.yml` | Tunnel Cloudflare dedicado |
| `deploy/swarm/brabustore.env.example` | Configuração não secreta |
| `scripts/deploy-homelab.sh` | Staging por digest e chamada remota autorizada |
| `scripts/homelab/deploy-stack.sh` | Validação, migration, health e rollback web |
| `scripts/expiry-scheduler.mjs` | Disparo diário interno do endpoint de expiração |

O deploy do Homelab recebe apenas uma referência GHCR completa por digest,
por exemplo `ghcr.io/melojrx/brabus_store@sha256:<digest>`. O controlador não
faz `git pull`, build ou push. Segredos são externalizados em Docker Swarm
secrets e não devem ser colocados neste arquivo, no vault ou em argumentos de
comando.

Antes de qualquer provisionamento, confirmar aprovação separada para criar o
Tunnel `brabustore-homelab`, a rede `brabustore_backend`, os secrets externos
e `/srv/brabustore/brabustore.env`. O ensaio usa somente o hostname temporário
`homelab.urbanlive.com.br`; os hostnames públicos da Brabus não são alterados.
O corte continua condicionado ao ensaio e às aprovações descritas na
especificação de migração.

### 10.1 Operação inicial exclusiva por PDV

Enquanto a loja operar somente com vendas presenciais, o arquivo
`/srv/brabustore/brabustore.env` deve conter:

```env
ONLINE_SALES_ENABLED=false
```

Essa variável não é segredo. O valor ausente, vazio ou diferente de `true`
mantém o modo fechado por segurança. Nesse estado, o catálogo continua público,
mas carrinho, checkout e Mercado Pago são bloqueados antes de qualquer escrita;
o cliente é direcionado ao WhatsApp e o PDV continua disponível para usuários
autorizados.

Para reativar vendas online, é necessário definir conscientemente
`ONLINE_SALES_ENABLED=true`, configurar credenciais e webhook válidos do
Mercado Pago e executar novamente a validação completa de checkout, pagamento,
webhook e reconciliação de estoque. Alterar somente o front-end não reativa a
operação.
