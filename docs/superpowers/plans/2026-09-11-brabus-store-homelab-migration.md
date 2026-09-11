# Brabus Store Homelab Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Execute inline in the original checkout, without a separate worktree. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transfer Brabus Store from the VPS to an isolated Docker Swarm deployment on the Homelab, retaining a verified return path to the VPS.

**Architecture:** GitHub Actions publishes a `linux/amd64` image to GHCR by digest. The Homelab deploys that digest into its own Swarm stack; a dedicated Cloudflare Tunnel sends Brabus traffic to the existing Traefik edge. PostgreSQL, uploads and the migration task stay on a private network.

**Tech Stack:** Next.js 16.1.7, Node 20, Prisma 5.22, PostgreSQL 16, Docker Swarm, Traefik v3.7, Cloudflare Tunnel, GHCR, GitHub Actions and Uptime Kuma.

## Global Constraints

- Do not modify VPS, Homelab, DNS, Cloudflare, Mercado Pago or production data until a task has fresh explicit approval.
- The Homelab receives a fully qualified GHCR digest only: it never builds, pushes or runs `git pull`.
- Use a dedicated `brabustore-homelab` Tunnel; do not reuse UrbanLive credentials or stack resources.
- Keep PostgreSQL off `edge` and do not publish its port.
- Put secret values only in GitHub Secrets or Docker Swarm secrets, never Git, vault, logs or command arguments.
- Migrations must remain expansive and compatible with the previous web image during a release window.
- Keep the VPS intact until the approved observation period ends.
- Do not accept health alone as proof: validate authenticated login, PDV, checkout, signed webhook, uploads and database integrity.
- Execute this plan inline in `/home/jrmelo/Projetos/brabus_store`; do not create or use a separate Git worktree.
- Start from `main` and use the dedicated work branch `codex/brabus-store-homelab-migration`; do not implement directly on `main`.
- Commit each completed task checkpoint on that branch; do not push or merge without explicit authorization.

## Required execution setup

Before Task 1, verify the checkout and create the work branch in the original directory:

```bash
cd /home/jrmelo/Projetos/brabus_store
git status --short --branch
git switch main
git pull --ff-only origin main
git switch -c codex/brabus-store-homelab-migration
```

Expected state: a clean checkout on `codex/brabus-store-homelab-migration`, whose starting point is the current `main`. If the branch already exists, switch to it only after verifying it was created from this `main` and contains no unrelated work. Do not run `git worktree add`, use another checkout, push the branch, or merge it as part of this plan.

## Blocking gates before the rehearsal

1. Diagnose and fix the recurring `Failed to find Server Action` log errors; prove a clean authenticated admin/PDV flow on the candidate build.
2. Implement and validate the `/api/cron/expiry-alerts` scheduler, or explicitly remove its operational promise from documentation.
3. Obtain a production window, write freeze method and a named operator for DNS return.

### Task 1: Split Prisma migration from the web process

**Files:**
- Create: `scripts/docker-start.sh`
- Create: `scripts/docker-migrate.sh`
- Modify: `scripts/docker-entrypoint.sh`
- Modify: `Dockerfile:43-46`
- Test: `tests/scripts/test-container-entrypoints.sh`

**Interfaces:** `docker-start.sh` starts only `node server.js`; `docker-migrate.sh` executes only `npx prisma migrate deploy`. The VPS entrypoint remains a compatibility wrapper for the web process.

- [ ] **Step 1: Write the failing contract test**

```sh
#!/bin/sh
set -eu
root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
grep -Fq 'exec node server.js' "$root/scripts/docker-start.sh"
grep -Fq 'npx prisma migrate deploy' "$root/scripts/docker-migrate.sh"
! grep -Fq 'npx prisma migrate deploy' "$root/scripts/docker-start.sh"
grep -Fq 'COPY scripts/docker-start.sh /usr/local/bin/docker-start.sh' "$root/Dockerfile"
grep -Fq 'COPY scripts/docker-migrate.sh /usr/local/bin/docker-migrate.sh' "$root/Dockerfile"
```

- [ ] **Step 2: Run the test before implementation**

Run: `sh tests/scripts/test-container-entrypoints.sh`
Expected: non-zero because the split scripts do not exist.

- [ ] **Step 3: Create the two exact entrypoints**

`docker-start.sh`:

```sh
#!/bin/sh
set -eu
mkdir -p /app/public/uploads/products
exec node server.js
```

`docker-migrate.sh`:

```sh
#!/bin/sh
set -eu
exec npx prisma migrate deploy
```

Copy both into `/usr/local/bin` in `Dockerfile`, mark executable, and make `docker-entrypoint.sh` execute `docker-start.sh`.

- [ ] **Step 4: Verify the runtime split**

Run: `sh tests/scripts/test-container-entrypoints.sh && npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

Run: `git add Dockerfile scripts/docker-entrypoint.sh scripts/docker-start.sh scripts/docker-migrate.sh tests/scripts/test-container-entrypoints.sh && git commit -m "refactor: split web startup from prisma migration"`

### Task 2: Build and publish an immutable GHCR image

**Files:**
- Create: `.github/workflows/build-homelab-image.yml`
- Create: `tests/scripts/test-homelab-workflow.sh`

**Interfaces:** a successful workflow outputs `ghcr.io/melojrx/brabus_store@sha256:<64-hex>` and writes it to `GITHUB_STEP_SUMMARY`.

- [ ] **Step 1: Write the failing static workflow test**

```sh
#!/bin/sh
set -eu
root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
workflow="$root/.github/workflows/build-homelab-image.yml"
grep -Fq 'packages: write' "$workflow"
grep -Fq 'linux/amd64' "$workflow"
grep -Fq 'npm run lint -- .' "$workflow"
grep -Fq 'npm test' "$workflow"
grep -Fq 'npm run build' "$workflow"
grep -Fq 'ghcr.io/melojrx/brabus_store' "$workflow"
```

- [ ] **Step 2: Establish the red state**

Run: `sh tests/scripts/test-homelab-workflow.sh`
Expected: non-zero because workflow is absent.

- [ ] **Step 3: Create the workflow**

Trigger on `push` to `main` and `workflow_dispatch`; grant `contents: read` and `packages: write`; use Node 20 and `npm ci`. Run lint, tests and build before `docker/build-push-action`. Push only `linux/amd64`, with provenance, to `ghcr.io/melojrx/brabus_store`; expose its returned digest as output and summary. Do not deploy from this workflow.

- [ ] **Step 4: Verify and publish a candidate**

Run: `sh tests/scripts/test-homelab-workflow.sh && npm run lint -- . && npm test && npm run build`
Expected: exit 0. Dispatch the workflow from the approved commit and record only workflow URL, commit, digest and time.

- [ ] **Step 5: Commit**

Run: `git add .github/workflows/build-homelab-image.yml tests/scripts/test-homelab-workflow.sh && git commit -m "ci: publish immutable homelab image"`

### Task 3: Add isolated Swarm and dedicated Tunnel manifests

**Files:**
- Create: `deploy/swarm/brabustore.yml`
- Create: `deploy/swarm/brabustore-edge.yml`
- Create: `deploy/swarm/brabustore.env.example`
- Create: `tests/scripts/test-brabustore-swarm-manifest.sh`

**Interfaces:** `${BRABUS_STORE_IMAGE}` is the digest; non-secrets are loaded from `/srv/brabustore/brabustore.env`; secrets are external Swarm secrets. Services resolve to `brabustore_web`, `brabustore_postgres`, `brabustore_migrate` and `brabustore-edge_cloudflared`.

- [ ] **Step 1: Write a failing manifest test**

```sh
#!/bin/sh
set -eu
root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
stack="$root/deploy/swarm/brabustore.yml"
edge="$root/deploy/swarm/brabustore-edge.yml"
grep -Fq 'brabustore_backend:' "$stack"
grep -Fq 'brabustore_postgres_data:' "$stack"
grep -Fq 'brabustore_uploads:' "$stack"
grep -Fq 'POSTGRES_PASSWORD_FILE: /run/secrets/brabustore_postgres_password' "$stack"
grep -Fq 'traefik.http.routers.brabustore.rule=Host(`brabustore.com.br`)' "$stack"
grep -Fq 'traefik.http.services.brabustore.loadbalancer.server.port=3000' "$stack"
grep -Fq 'brabustore_cloudflared_tunnel_token' "$edge"
```

- [ ] **Step 2: Run the red test**

Run: `sh tests/scripts/test-brabustore-swarm-manifest.sh`
Expected: non-zero because manifests are absent.

- [ ] **Step 3: Define `brabustore.yml`**

Define `postgres:16` on only `brabustore_backend`, with named volume `brabustore_postgres_data`, `POSTGRES_PASSWORD_FILE`, `pg_isready` healthcheck and `node.hostname == homelab`. Define `web` from `${BRABUS_STORE_IMAGE}`, on `edge` and `brabustore_backend`, with `brabustore_uploads:/app/public/uploads`, one replica, `start-first` update/rollback, and a health request to `/api/health` with the public Host and forwarded HTTPS headers.

Define `migrate` from the same digest with command `["/usr/local/bin/docker-migrate.sh"]`, only `brabustore_backend`, zero replicas and `restart_policy.condition: none`. Attach Traefik labels to `web` only: Host `brabustore.com.br`, entrypoint `web`, forwarded HTTPS middleware and backend port `3000`.

- [ ] **Step 4: Define the Tunnel and config template**

`brabustore-edge.yml` contains only one cloudflared service, image `cloudflare/cloudflared:2026.8.1`, external secret `brabustore_cloudflared_tunnel_token`, `edge` network and one replica. `brabustore.env.example` lists only `BRABUS_STORE_IMAGE`, `POSTGRES_DB`, `POSTGRES_USER`, `DATABASE_HOST`, `DATABASE_PORT`, `NEXTAUTH_URL` and `AUTH_TRUST_HOST`.

- [ ] **Step 5: Verify manifests**

Run: `sh tests/scripts/test-brabustore-swarm-manifest.sh && docker compose -f deploy/swarm/brabustore.yml config`
Expected: static assertions pass; provide temporary non-secret values only for interpolation.

- [ ] **Step 6: Commit**

Run: `git add deploy/swarm tests/scripts/test-brabustore-swarm-manifest.sh && git commit -m "feat: add brabus store swarm manifests"`

### Task 4: Implement the digest deployment controller

**Files:**
- Create: `scripts/homelab/load-env.sh`
- Create: `scripts/homelab/deploy-stack.sh`
- Create: `scripts/deploy-homelab.sh`
- Create: `tests/scripts/test-brabustore-deploy-controller.sh`

**Interfaces:** `scripts/deploy-homelab.sh [--stage-only] <digest>` accepts exactly `ghcr.io/melojrx/brabus_store@sha256:<64 lowercase hex>`, stages only versioned files under `/srv/brabustore/releases/sha256-<digest>`, and starts the remote controller with `sudo`.

- [ ] **Step 1: Write the failing controller test**

```sh
#!/bin/sh
set -eu
root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
grep -Fq "BRABUSTORE_ROOT='/srv/brabustore'" "$root/scripts/deploy-homelab.sh"
grep -Fq 'validate_brabustore_image' "$root/scripts/homelab/load-env.sh"
grep -Fq 'docker service rollback "$WEB_SERVICE"' "$root/scripts/homelab/deploy-stack.sh"
grep -Fq 'docker service scale --detach=true "$MIGRATE_SERVICE=1"' "$root/scripts/homelab/deploy-stack.sh"
grep -Fq 'brabustore_backend' "$root/scripts/homelab/deploy-stack.sh"
```

- [ ] **Step 2: Run the red test**

Run: `sh tests/scripts/test-brabustore-deploy-controller.sh`
Expected: non-zero because scripts are absent.

- [ ] **Step 3: Implement safe staging and deployment**

Reuse UrbanLive's line parser and exact 64-hex digest validation, changing all names to Brabus. The remote controller must: validate Swarm state; require `edge` and `brabustore_backend`; require external secret names; load `/srv/brabustore/brabustore.env`; wait for the one-shot migrate task to reach `Complete`; scale migrate to zero; deploy web; poll container health; send `Host: brabustore.com.br` and `X-Forwarded-Proto: https`; print redacted diagnostics; rollback only web on failed health.

- [ ] **Step 4: Verify script contracts**

Run: `sh tests/scripts/test-brabustore-deploy-controller.sh && sh -n scripts/deploy-homelab.sh scripts/homelab/load-env.sh scripts/homelab/deploy-stack.sh`
Expected: exit 0.

- [ ] **Step 5: Commit**

Run: `git add scripts/deploy-homelab.sh scripts/homelab tests/scripts/test-brabustore-deploy-controller.sh && git commit -m "feat: add homelab release controller"`

### Task 5: Provision Homelab prerequisites under a separate approval

**Files:**
- Modify: `docs/DEPLOY.md`
- Modify: `docs/superpowers/specs/2026-09-11-brabus-store-homelab-migration-design.md`
- Evidence: approved release record outside Git

**Interfaces:** produces `brabustore_backend`, external Swarm secrets, `/srv/brabustore/brabustore.env` and the dedicated Tunnel, but does not change live public DNS.

- [ ] **Step 1: Create the dedicated Cloudflare Tunnel**

Create `brabustore-homelab`. Configure only `brabustore.com.br` and `www.brabustore.com.br` ingress to `http://traefik:80`; retain existing public routing until a later cutover approval. Create its token directly as `brabustore_cloudflared_tunnel_token` via standard input.

- [ ] **Step 2: Provision network, secrets and host config**

Run: `ssh melojr@100.93.170.120 'sudo docker network create --driver overlay --attachable brabustore_backend'`.

Create external secrets by standard input: PostgreSQL password and URL, NextAuth secret, Mercado Pago access/webhook secrets, cron secret, integration keys and active webhook secrets. Create `/srv/brabustore/brabustore.env` from the example, mode `0640`, root-owned, with non-secret configuration only.

- [ ] **Step 3: Verify names, not values**

Run: `ssh melojr@100.93.170.120 'sudo docker info --format "{{.Swarm.LocalNodeState}}"; sudo docker network inspect edge brabustore_backend >/dev/null; sudo docker secret ls --format "{{.Name}}" | grep "^brabustore_"'`
Expected: `active`; both networks resolve; required secret names are visible.

- [ ] **Step 4: Commit redacted documentation**

Run: `git add docs/DEPLOY.md docs/superpowers/specs/2026-09-11-brabus-store-homelab-migration-design.md && git diff --cached --check && git commit -m "docs: document brabus store homelab prerequisites"`

### Task 6: Restore rehearsal data and validate staging

**Files:**
- Create: `scripts/homelab/verify-rehearsal.sh`
- Create: `tests/scripts/test-brabustore-rehearsal-verifier.sh`
- Modify: `docs/DEPLOY.md`

**Interfaces:** `verify-rehearsal.sh <https-base-url> <stack>` is read-only; it checks public health, PDV redirect, Prisma migration state and supplied upload checksum manifest without exposing env values.

- [ ] **Step 1: Write the failing verifier test**

```sh
#!/bin/sh
set -eu
root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
script="$root/scripts/homelab/verify-rehearsal.sh"
grep -Fq '/api/health' "$script"
grep -Fq '/admin/pdv' "$script"
grep -Fq 'prisma migrate status' "$script"
grep -Fq 'sha256sum --check' "$script"
```

- [ ] **Step 2: Run the red test**

Run: `sh tests/scripts/test-brabustore-rehearsal-verifier.sh`
Expected: non-zero because script is absent.

- [ ] **Step 3: Build and use the verifier**

Reject non-HTTPS URLs. Check `/api/health`, follow the unauthenticated
`/admin/pdv` redirect, find the web task by Swarm service label, run `npx
prisma migrate status` inside it, and validate the supplied uploads manifest
with `sha256sum --check`. Do not create order, mutate data, alter DNS or print
configuration.

- [ ] **Step 4: Run the rehearsal**

Under separate approval, create a timestamped PostgreSQL custom dump and upload archive/checksum on the VPS, restore them into the isolated Homelab stack, deploy the candidate digest to a non-production Tunnel hostname, then run the verifier. Manually validate authenticated login, product images, SELLER PDV, reversible payment and signed webhook.

- [ ] **Step 5: Commit**

Run: `git add scripts/homelab/verify-rehearsal.sh tests/scripts/test-brabustore-rehearsal-verifier.sh docs/DEPLOY.md && git commit -m "test: add homelab rehearsal verifier"`

### Task 7: Cut over production only with fresh approval

**Files:**
- Modify: `docs/DEPLOY.md`
- Modify: `docs/superpowers/specs/2026-09-11-brabus-store-homelab-migration-design.md`
- Modify: `/home/jrmelo/Documentos/Obsidian Vault/02-Projetos/Brabus Store/02-Infra-e-Deploy-VPS.md`
- Modify: `/home/jrmelo/Documentos/Obsidian Vault/02-Projetos/Brabus Store/03-Operacao-e-Manutencao.md`

**Interfaces:** consumes written production-window approval and successful rehearsal; produces either validated public Homelab operation or documented public return to VPS.

- [ ] **Step 1: Confirm every gate**

Confirm Server Actions/scheduler resolution, approved digest, fresh source dump, upload checksum, passed rehearsal, write-freeze method and DNS return operator. Stop if one is missing.

- [ ] **Step 2: Freeze, synchronize and restore final data**

Block checkout/PDV writes by an approved operational method. Generate final dump and uploads archive on VPS; validate checksums after transfer and restore without deleting VPS volumes.

- [ ] **Step 3: Deploy and privately validate**

Deploy the approved digest, run `verify-rehearsal.sh`, then authenticate as admin and seller to validate login/PDV, product uploads, checkout and webhook before DNS changes.

- [ ] **Step 4: Route through the new Tunnel**

Only after all gates pass, route both public hostnames through `brabustore-homelab`. Confirm Mercado Pago reaches the public endpoint with accepted signature; do not rotate credentials without separate authorization.

- [ ] **Step 5: Monitor and return safely on failure**

Add Uptime Kuma monitors for public storefront/health and container state. If health, login, PDV, checkout, webhook or integrity fails, route traffic back to VPS immediately, preserve Homelab evidence, and reconcile any post-dump write before retrying.

- [ ] **Step 6: Update evidence-backed documentation**

Record verified digest, date, monitor names, hosting state and VPS retention in repo/vault docs. Do not label the VPS decommissioned without a later explicit decision.

## Plan self-review

| Spec requirement | Covered by |
|---|---|
| Dedicated Tunnel and isolated stack | Tasks 3 and 5 |
| GHCR immutable image | Task 2 |
| One-shot migration and web-only rollback | Tasks 1 and 4 |
| Secrets outside Git/vault | Tasks 3 through 5 |
| Restore rehearsal | Task 6 |
| Login, PDV, payment and webhook gates | Tasks 6 and 7 |
| DNS cutover and VPS return | Task 7 |
| Server Action and scheduler gates | Blocking gates and Task 7 |

## Execution mode

This plan is intentionally inline and sequential. Use
`superpowers:executing-plans`, pause at every external-operation approval gate,
and keep all code, manifests, tests and commits in the original checkout on
`codex/brabus-store-homelab-migration`. A later integration step may merge or
push only after explicit authorization.
