# Migracao de VPS

## Brabu's Performance Store

---

**Documento:** Plano de Migracao de Infraestrutura
**Versao:** 2.1
**Data:** Maio de 2026
**Origem:** VPS Easypanel (145.223.92.74)
**Destino:** VPS srvjosemaria (38.52.128.62)
**Status:** Migracao concluida; documento mantido como historico e referencia operacional.

---

## 1. Objetivo

Registrar a migracao da aplicacao brabustore da VPS antiga (Easypanel + Traefik) para a VPS `srvjosemaria` (38.52.128.62), que ja hospeda Hermes e FinanPy. Stack atual: Docker Compose + NGINX + Certbot + GitHub Actions via SSH.

O guia operacional ativo esta em `docs/DEPLOY.md`.

---

## 2. Inventario da VPS atual (origem)

| Item | Detalhe |
|------|---------|
| IP | 145.223.92.74 |
| OS | Ubuntu 24.04 LTS |
| Orquestracao | Easypanel (Docker Swarm + Traefik 3.6.7) |
| App | Next.js 16 standalone (node:20-bookworm-slim) |
| DB | PostgreSQL 16 (container) |
| Dominio | brabustore.com.br + www.brabustore.com.br |
| SSL | Let's Encrypt via Traefik |
| Porta interna | 3000 |
| Uploads | /app/public/uploads/products (40 arquivos, 45MB) |
| Tamanho DB | ~9MB |

### 2.1 Backup realizado (2026-05-31)

- `backups/20260531/brabustore_backup_20260531.dump` — pg_dump formato custom
- `backups/20260531/uploads/products/` — 40 imagens JPG

---

## 3. VPS destino (srvjosemaria — 38.52.128.62)

| Item | Detalhe |
|------|---------|
| IP | 38.52.128.62 |
| Hostname | srvjosemaria |
| OS | Ubuntu 24.04.4 LTS |
| CPU | 6 cores Xeon E5-2690 v2 |
| RAM | 9.7 GB |
| Disco | 77 GB |
| Docker | 29.1.3 |
| Compose | 2.40.3 |
| NGINX | 1.24.0 |
| Certbot | 2.9.0 |
| Firewall | UFW + Fail2Ban ativos |

### 3.1 Aplicacoes ja rodando na VPS destino

| App | Porta | Dominio |
|-----|-------|---------|
| Hermes WebUI (Neo) | 8787 | neo.investiorion.com |
| Hermes Gateway | 8644 | neo.investiorion.com/webhooks/ |
| Hermes WhatsApp Bridge | 3000 | interno |
| FinanPy | 8001 (Docker) | investiorion.com |
| Redis | 6379 | interno |

### 3.2 Recursos disponiveis

- RAM livre: ~7.8 GB
- Disco livre: ~54 GB

---

## 4. Decisoes

| Decisao | Escolha |
|---------|---------|
| Dominio | brabustore.com.br (mesmo) |
| Porta interna | 3001 (3000 ocupada por WhatsApp Bridge) |
| Build | Local na VPS (git pull + docker compose build) |
| Deploy user | root |
| Path na VPS | /srv/apps/brabustore/ (padrao FinanPy) |
| Compose file | docker-compose.vps.yml |
| CI/CD | GitHub Actions -> SSH -> deploy.sh |

---

## 5. Padrao de deploy (identico ao FinanPy)

```
GitHub push main → GitHub Actions → SSH → deploy.sh
                                           ├── git fetch + reset --hard
                                           ├── docker compose build
                                           ├── docker compose up -d
                                           ├── prisma migrate deploy no startup do app
                                           ├── health check (curl)
                                           ├── NGINX publica brabustore.com.br
                                           └── docker image prune
```

---

## 6. Arquivos de infraestrutura no repositorio

| Arquivo | Descricao |
|---------|-----------|
| `docker-compose.vps.yml` | Compose de producao (app + postgres) |
| `deploy.sh` | Script de deploy (git pull + build + up + health) |
| `.github/workflows/deploy.yml` | Pipeline CI/CD |
| `infra/nginx/brabustore.conf` | Config NGINX de referencia |
| `scripts/docker-entrypoint.sh` | Entrypoint: migrate + start |
| `Dockerfile` | Multi-stage build (standalone) |

---

## 7. Env vars necessarias

```
DATABASE_URL=postgresql://brabustore:PASSWORD@db:5432/brabustore
NEXTAUTH_URL=https://brabustore.com.br
NEXTAUTH_SECRET=
AUTH_TRUST_HOST=true
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES=card
MELHOR_ENVIO_TOKEN=
MELHOR_ENVIO_BASE_URL=https://melhorenvio.com.br/api/v2
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_FALLBACK_POSTS=[]
WEBHOOK_SECRET=
POSTGRES_USER=brabustore
POSTGRES_PASSWORD=
POSTGRES_DB=brabustore
```

Arquivo `.env.production` fica em `/srv/apps/brabustore/` (nunca versionado).

---

## 8. Etapas de migracao

Checklist historico da migracao. Para operacao atual de deploy, use `docs/DEPLOY.md`.

### 8.1 Preparar VPS destino

- [ ] Clonar repo: `git clone <repo-url> /srv/apps/brabustore`
- [ ] Criar `.env.production` em `/srv/apps/brabustore/`
- [ ] Subir DB: `docker compose -f docker-compose.vps.yml --env-file .env.production up -d db`
- [ ] Aguardar DB healthy

### 8.2 Restaurar dados

- [ ] Copiar dump para VPS: `scp backups/20260531/brabustore_backup_20260531.dump root@38.52.128.62:/tmp/`
- [ ] Restaurar: `docker compose -f docker-compose.vps.yml exec -T db pg_restore -U brabustore -d brabustore < /tmp/brabustore_backup_20260531.dump`
- [ ] Copiar uploads para volume
- [ ] Validar: contagem de registros

### 8.3 Primeiro deploy

- [ ] Executar: `./deploy.sh` (ou FORCE=1 ./deploy.sh)
- [ ] Verificar health: `curl http://127.0.0.1:3001/api/health`
- [ ] Verificar logs: `docker compose -f docker-compose.vps.yml logs app`

### 8.4 Configurar NGINX + SSL

- [ ] Copiar config: `cp infra/nginx/brabustore.conf /etc/nginx/sites-available/brabustore`
- [ ] Ativar: `ln -s /etc/nginx/sites-available/brabustore /etc/nginx/sites-enabled/`
- [ ] Obter certificado: `certbot --nginx -d brabustore.com.br -d www.brabustore.com.br`
- [ ] Testar: `nginx -t && systemctl reload nginx`

### 8.5 Configurar GitHub

- [ ] Adicionar GitHub Secrets:
  - `VPS_HOST` = 38.52.128.62
  - `VPS_DEPLOY_KEY` = chave privada SSH
- [ ] Testar: push em main ou workflow_dispatch com force=true

### 8.6 Migrar DNS

- [ ] Reduzir TTL para 300s (24h antes)
- [ ] Atualizar registro A de brabustore.com.br para 38.52.128.62
- [ ] Atualizar registro A de www.brabustore.com.br para 38.52.128.62
- [ ] Monitorar propagacao
- [ ] Atualizar endpoint webhook no painel Stripe

### 8.7 Pos-migracao

- [ ] Verificar SSL: `certbot renew --dry-run`
- [ ] Verificar logs de erro
- [ ] Confirmar Easypanel antigo pode ser desligado
- [ ] Restaurar TTL DNS para 3600s

---

## 9. Riscos e mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Downtime durante DNS | TTL baixo + validacao pre-switch |
| Perda de uploads | Backup local ja realizado |
| Secrets expostos | GitHub Secrets + .env nao versionado |
| Stripe webhook falha | Atualizar endpoint apos DNS propagar |
| Build falha na VPS | Testar build antes de migrar DNS |
| Conflito de porta | Porta 3001 confirmada livre |

---

## 10. Rollback

1. Reverter registro A para 145.223.92.74
2. Aguardar propagacao (TTL 300s = 5 min)
3. VPS antiga continua rodando ate confirmacao final

---

## 11. Monitoramento

- Health endpoint: `https://brabustore.com.br/api/health`
- Logs: `docker compose -f docker-compose.vps.yml logs -f app`
- Deploy: GitHub Actions tab no repositorio
