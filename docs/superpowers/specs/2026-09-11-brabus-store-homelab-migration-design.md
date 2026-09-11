# Brabus Store — Migração para o Homelab: Design

**Data:** 2026-09-11
**Status:** aprovado para implementação controlada
**Escopo:** arquitetura, publicação e migração da produção atual da VPS para o Homelab. Esta especificação não autoriza mudanças na VPS, DNS, Cloudflare, Mercado Pago ou Homelab sem o gate de aprovação operacional correspondente.

## Objetivo

Hospedar a Brabus Store no Homelab com o mesmo padrão operacional do
UrbanLive: Docker Swarm em nó único, imagens imutáveis no GHCR, Cloudflare
Tunnel e Traefik. A mudança deve preservar PostgreSQL, uploads, autenticação,
checkout Mercado Pago, webhook e PDV, com ensaio completo e retorno para a VPS
caso a validação falhe.

## Estado de origem confirmado

| Item | Estado |
|---|---|
| Host | VPS `srvjosemaria`, Ubuntu 24.04 |
| Aplicação | Next.js 16.1.7, React 19, Prisma 5 |
| Dados | PostgreSQL 16 e volume de uploads |
| Proxy público | NGINX, com app em `127.0.0.1:3001` |
| Domínio | `brabustore.com.br` |
| Deploy | GitHub Actions → SSH → Docker Compose |
| Código em produção observado | `c3f9507` |
| Banco observado | 19 migrations, schema atualizado |

O log atual registra erros recorrentes de Server Actions. Além disso, não foi
confirmado um agendador ativo para `POST /api/cron/expiry-alerts`. Ambos são
gates de correção/decisão antes de uma migração de produção.

## Arquitetura alvo

```text
GitHub Actions
  -> lint, testes e build linux/amd64
  -> GHCR: imagem identificada por digest
  -> controlador de deploy executado pelo operador autorizado

Internet
  -> Cloudflare DNS, TLS e WAF
  -> Tunnel dedicado brabustore-homelab
  -> Traefik na rede overlay edge
  -> brabustore_web (Next.js, 1 réplica)
  -> brabustore_postgres (PostgreSQL 16, rede interna)
  -> volume brabustore_uploads
  -> job brabustore_migrate (one-shot por release)
  -> brabustore_scheduler (disparo diário interno)
```

O Tunnel da Brabus será dedicado, separado do UrbanLive. A aplicação, o
banco e o job de migration recebem nomes e redes próprios para impedir
colisão de recursos. PostgreSQL não tem porta publicada e não participa da
rede `edge`.

## Componentes e contratos

### Stack Swarm

- `brabustore_web`: recebe tráfego apenas via Traefik; usa a imagem GHCR por
  digest, a rede `edge`, a rede interna `brabustore_backend` e o volume de
  uploads.
- `brabustore_postgres`: PostgreSQL 16 em `brabustore_backend`, com volume
  `brabustore_postgres_data`; sem porta publicada.
- `brabustore_migrate`: job one-shot que usa a mesma imagem do web e executa
  `npx prisma migrate deploy` antes da atualização do web.
- `brabustore_scheduler`: uma réplica interna que chama diariamente
  `POST /api/cron/expiry-alerts` usando o secret `brabustore_cron_secret`; não
  participa da rede `edge`.
- `brabustore_cloudflared`: usa token de um Tunnel Cloudflare exclusivo; no
  ensaio encaminha `homelab.urbanlive.com.br` para Traefik porque essa é a zona
  gerenciada disponível, e o corte posterior encaminhará os hostnames públicos.
- Traefik e a rede `edge` existentes no Homelab são reutilizados; não será
  criado um segundo proxy público.

### Secrets e configuração

Segredos Swarm, nunca Git/vault/log, devem cobrir: URL/senha PostgreSQL,
`NEXTAUTH_SECRET`, credenciais Mercado Pago, assinatura do webhook, segredo do
cron, chaves de integração e token do Tunnel. Valores são migrados por
inventário de nomes e teste de presença; não por cópia do `.env.production`.

Configuração não secreta, manifests e scripts de deploy permanecem
versionados. A imagem é sempre referenciada por digest completo, não por tag
mutável.

### Publicação e rollback

O Homelab não executará `git pull`, build ou push. A pipeline produz uma imagem
`linux/amd64` no GHCR após verificações locais/CI. O operador publica uma
release pelo digest; o controlador executa migration uma vez, atualiza web e
confirma health antes de considerar a mudança válida.

Rollback de imagem é permitido apenas para o serviço web e não desfaz schema
ou dados. Migrations precisam ser expansivas e compatíveis com a imagem
anterior durante a janela de retorno.

## Estratégia de migração de dados

### Ensaio obrigatório

1. Criar dump lógico consistente do PostgreSQL na VPS e registrar checksum,
   tamanho e horário de coleta.
2. Copiar uploads preservando estrutura e validar checksum do conjunto.
3. Restaurar os dois artefatos em ambiente isolado do Homelab.
4. Executar `prisma migrate status` e comprovar que o schema está atualizado.
5. Expor somente um hostname de ensaio pelo Tunnel dedicado.
6. Validar autenticadamente login, catálogo, uploads, PDV, pedido reversível,
   checkout Mercado Pago e recebimento do webhook assinado.

### Corte

O corte requer janela de manutenção e bloqueio coordenado de novas escritas na
VPS. Depois do dump e da cópia final de uploads, a restauração no Homelab é
repetida, o novo stack passa todos os gates e só então Cloudflare encaminha
`brabustore.com.br` ao Tunnel novo. A configuração do webhook Mercado Pago é
confirmada contra a URL pública final antes de liberar a operação.

### Retorno

Se health, login, PDV, pagamento ou webhook falhar durante a observação, a
rota pública retorna à VPS. A VPS e seus dados não são descartados no corte;
qualquer dado escrito no Homelab durante a falha exige reconciliação explícita
antes de uma nova tentativa.

## Critérios de aceite

- Backup de PostgreSQL e uploads com restauração ensaiada e comprovada.
- Serviço web, PostgreSQL, Tunnel e Traefik saudáveis no Homelab.
- Health HTTP 200 e verificações autenticadas de login e PDV.
- Checkout Mercado Pago e webhook assinado validados com operação reversível
  ou descartável.
- Uptime Kuma monitora disponibilidade pública, health e recursos essenciais.
- Sem portas públicas abertas no roteador; exposição somente pelo Cloudflare
  Tunnel.
- Sem segredos em repositório, vault, comandos salvos ou logs.
- Rota de retorno para a VPS documentada e testável antes da alteração DNS.

## Fora de escopo

- Alterar funcionalidades de checkout, PDV, autenticação ou modelo de dados.
- Corrigir os erros de Server Actions nesta entrega de infraestrutura; eles
  serão diagnosticados e resolvidos como gate anterior.
- Criar alta disponibilidade, réplica de banco ou backup externo automático.
- Desativar ou apagar a VPS após o corte inicial.

## Riscos e decisões

| Risco | Decisão |
|---|---|
| Nó único no Homelab | manter a VPS durante observação e não declarar HA |
| Migration não reversível | adotar migrations expansivas e tratar banco separadamente do rollback de imagem |
| Dados novos durante falha | bloquear escrita no corte e exigir reconciliação se houver retorno |
| Webhook/pagamento externo | validar a URL pública e a assinatura antes da liberação |
| Incidente no UrbanLive | Tunnel e stack da Brabus isolados; Traefik é o único componente compartilhado |

## Estado de implementação

Os artefatos locais de aplicação do desenho são implementados na branch
`codex/brabus-store-homelab-migration`, no checkout original do projeto e sem
worktree separado. Já estão preparados a separação entre startup web e
migration, a publicação GHCR por digest, os manifestos Swarm isolados e o
controlador de release. O probe inválido de Server Actions agora é rejeitado
antes do dispatcher interno do Next, e o scheduler diário foi adicionado ao
stack como serviço privado. A validação autenticada, a publicação da imagem,
o provisionamento de infraestrutura e a alteração de DNS permanecem
pendentes de aprovação operacional explícita.
