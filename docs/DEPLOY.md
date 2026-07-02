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
  -> scripts/docker-entrypoint.sh
  -> npx prisma migrate deploy
  -> node server.js
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
| `scripts/docker-entrypoint.sh` | Executa migrations Prisma e inicia o servidor |
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

O container executa automaticamente:

```bash
npx prisma migrate deploy
```

Isso acontece no startup do app via `scripts/docker-entrypoint.sh`. Portanto, quando o container e recriado com uma imagem nova, migrations versionadas em `prisma/migrations/` sao aplicadas antes do `node server.js`.

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
