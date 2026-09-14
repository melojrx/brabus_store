# Shared Homelab Deployment Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan inline, task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate independent `main` releases from Brabus Store and UrbanLive to their existing isolated Homelab stacks, then retire the Brabus application runtime on the VPS without deleting recoverable data.

**Architecture:** GitHub-hosted jobs validate and publish a `linux/amd64` GHCR image by immutable digest. Each private repository dispatches its own post-build deployment job to a dedicated Homelab runner account, which can invoke only that application's root-owned deployment wrapper. The existing application controllers remain responsible for migration, Swarm `start-first` updates, readiness checks, and web rollback.

**Tech Stack:** GitHub Actions, GitHub-hosted runners, repository-scoped self-hosted runners, systemd, sudoers command allowlists, Docker Swarm, GHCR, Cloudflare Tunnel, Traefik, Next.js/Prisma/PostgreSQL, Django/PostgreSQL/Redis.

## Global Constraints

- Each deploy uses a complete `ghcr.io/...@sha256:<64 lowercase hex>` reference; never `latest` or a mutable tag.
- Build/test jobs run on GitHub-hosted runners; only deploy jobs use the Homelab runner labels.
- A repository's job may operate only its own stack prefix, release root, networks, volumes, secrets, and public health endpoints.
- Production deploy jobs run only for protected `main` pushes; never for pull requests, forks, or arbitrary image inputs.
- `concurrency` is scoped per application and queues releases (`cancel-in-progress: false`).
- The Homelab never builds application images or executes `git pull` for a release.
- No secrets, backup credentials, database dumps, or private keys are committed or printed.
- Do not stop Brabus on the VPS until all gates in Task 8 pass.
- External Cloudflare R2 backup automation is a backlog after all three application pipelines are validated.
- Execute inline in this conversation; do not delegate tasks to subagents.
- Before Task 1, create `codex/homelab-deployment-automation` in each repository's existing checkout. Do not create a separate Git worktree.

---

## Task 0: Prepare inline working branches in the existing checkouts

**Files:**
- Modify: Git branch metadata only in `/home/jrmelo/Projetos/brabus_store` and `/home/jrmelo/Projetos/engage_hub_django`.

**Interfaces:**
- Consumes: clean original checkouts and the two documentation commits already local in Brabus.
- Produces: one same-named working branch per repository without a new worktree directory.

- [ ] **Step 1: Confirm both original checkouts are clean**

Run:

```bash
cd /home/jrmelo/Projetos/brabus_store && git status --short
cd /home/jrmelo/Projetos/engage_hub_django && git status --short
```

Expected: no uncommitted files. Stop and preserve any user-owned change before switching branches.

- [ ] **Step 2: Create the Brabus working branch in the current checkout**

Run:

```bash
cd /home/jrmelo/Projetos/brabus_store
git switch -c codex/homelab-deployment-automation
```

Expected: the current directory remains `/home/jrmelo/Projetos/brabus_store`; no `git worktree add` command is used.

- [ ] **Step 3: Create the UrbanLive working branch in its current checkout**

Run:

```bash
cd /home/jrmelo/Projetos/engage_hub_django
git switch -c codex/homelab-deployment-automation
```

Expected: the current directory remains `/home/jrmelo/Projetos/engage_hub_django`; no separate worktree exists.

- [ ] **Step 4: Record the execution mode**

Execute all remaining tasks inline in this conversation, review each task's diff and verification output before starting the next task, and do not invoke subagent-driven development.

---

## File Map

### Brabus Store (`/home/jrmelo/Projetos/brabus_store`)

| File | Responsibility |
| --- | --- |
| `.github/workflows/build-homelab-image.yml` | CI image job output and deploy job for `homelab-brabustore-deploy` |
| `.github/workflows/deploy.yml` | Remove obsolete VPS deployment trigger |
| `tests/scripts/test-homelab-workflow.sh` | Assert immutable image, runner label, deploy dependency, and no VPS deploy workflow |
| `ops/homelab-runner/deploy-brabustore` | Versioned source for the root-owned Brabus wrapper |
| `docs/DEPLOY.md` | Operational release and recovery documentation |

### UrbanLive (`/home/jrmelo/Projetos/engage_hub_django`)

| File | Responsibility |
| --- | --- |
| `.github/workflows/deploy.yml` | CI build output and deploy job for `homelab-urbanlive-deploy` |
| `deploy/swarm/urbanlive.yml` | Persist the Traefik healthcheck protocol header |
| `tests/scripts/test_swarm_healthcheck.sh` | Assert the runtime incident fix is versioned |
| `tests/scripts/test_homelab_workflow.sh` | New static workflow contract test |
| `ops/homelab-runner/deploy-urbanlive` | Versioned source for the root-owned UrbanLive wrapper |
| `docs/DEPLOY.md` | New operator-facing release documentation |

### Homelab (operator-managed, not committed with secrets)

| Path | Responsibility |
| --- | --- |
| `/usr/local/sbin/deploy-brabustore-release` | Root-owned Brabus wrapper installed from its reviewed repository source |
| `/usr/local/sbin/deploy-urbanlive-release` | Root-owned UrbanLive wrapper installed from its reviewed repository source |
| `/etc/sudoers.d/80-runner-brabustore-deploy` | Allow only the Brabus wrapper for the Brabus runner account |
| `/etc/sudoers.d/80-runner-urbanlive-deploy` | Allow only the UrbanLive wrapper for the UrbanLive runner account |
| `/opt/actions-runner-brabustore` | Brabus repository runner installation |
| `/opt/actions-runner-urbanlive` | UrbanLive repository runner installation |
| `actions.runner.*.service` | One systemd runner service per repository |

## Task 1: Add a testable deploy-wrapper contract to Brabus

**Files:**
- Create: `ops/homelab-runner/deploy-brabustore`
- Create: `tests/scripts/test-brabustore-runner-wrapper.sh`
- Modify: `tests/scripts/test-homelab-workflow.sh`

**Interfaces:**
- Consumes: `$1` full Brabus GHCR digest, `$2` checkout path supplied by the GitHub runner.
- Produces: a staged Brabus release below `/srv/brabustore/releases/sha256-<digest>` and exit status from `/srv/brabustore/bin/deploy-stack.sh`.

- [ ] **Step 1: Write the failing wrapper contract test**

Create `tests/scripts/test-brabustore-runner-wrapper.sh`:

```sh
#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
wrapper="$root/ops/homelab-runner/deploy-brabustore"

grep -Fq "BRABUSTORE_ROOT='/srv/brabustore'" "$wrapper"
grep -Fq 'validate_brabustore_image "$image"' "$wrapper"
grep -Fq 'tar -C "$checkout" -cf - deploy/swarm scripts/homelab' "$wrapper"
grep -Fq '"$BRABUSTORE_ROOT/bin/deploy-stack.sh" "$release_directory" "$image"' "$wrapper"
! grep -Eq '(^|[[:space:]])(git pull|git fetch|docker build)' "$wrapper"
```

- [ ] **Step 2: Run the test and confirm it fails because the wrapper is absent**

Run: `sh tests/scripts/test-brabustore-runner-wrapper.sh`

Expected: non-zero exit because `ops/homelab-runner/deploy-brabustore` does not exist.

- [ ] **Step 3: Create the minimal root-wrapper source**

Create `ops/homelab-runner/deploy-brabustore`:

```sh
#!/bin/sh
set -eu

BRABUSTORE_ROOT='/srv/brabustore'
checkout=${1:?Usage: deploy-brabustore <checkout> <image-digest>}
image=${2:?Usage: deploy-brabustore <checkout> <image-digest>}

case "$checkout" in
  /opt/actions-runner-brabustore/_work/brabus_store/brabus_store) ;;
  *) printf '%s\n' 'Invalid Brabus checkout path.' >&2; exit 1 ;;
esac

. "$checkout/scripts/homelab/load-env.sh"
validate_brabustore_image "$image"

for file in deploy/swarm/brabustore.yml deploy/swarm/brabustore-edge.yml \
  deploy/swarm/brabustore.env.example scripts/homelab/load-env.sh \
  scripts/homelab/deploy-stack.sh; do
  test -f "$checkout/$file" || { printf 'Required release file is missing: %s\n' "$file" >&2; exit 1; }
done

digest=${image#ghcr.io/melojrx/brabus_store@sha256:}
release_directory="$BRABUSTORE_ROOT/releases/sha256-$digest"
install -d -m 0750 -o root -g root "$release_directory"
tar -C "$checkout" -cf - deploy/swarm scripts/homelab | tar -xf - -C "$release_directory"
install -m 0755 "$release_directory/scripts/homelab/load-env.sh" "$BRABUSTORE_ROOT/bin/load-env.sh"
install -m 0755 "$release_directory/scripts/homelab/deploy-stack.sh" "$BRABUSTORE_ROOT/bin/deploy-stack.sh"
exec "$BRABUSTORE_ROOT/bin/deploy-stack.sh" "$release_directory" "$image"
```

- [ ] **Step 4: Run static checks**

Run: `sh -n ops/homelab-runner/deploy-brabustore && sh tests/scripts/test-brabustore-runner-wrapper.sh`

Expected: exit 0.

- [ ] **Step 5: Extend the workflow static test**

Append these assertions to `tests/scripts/test-homelab-workflow.sh` after the existing image assertions:

```sh
grep -Fq 'outputs:' "$workflow"
grep -Fq 'image: ${{ steps.build.outputs.digest }}' "$workflow"
grep -Fq 'deploy:' "$workflow"
grep -Fq 'needs: image' "$workflow"
grep -Fq '[self-hosted, homelab-brabustore-deploy]' "$workflow"
grep -Fq 'cancel-in-progress: false' "$workflow"
test ! -e "$root/.github/workflows/deploy.yml"
```

- [ ] **Step 6: Commit the contract tests and wrapper source**

```bash
git add ops/homelab-runner/deploy-brabustore \
  tests/scripts/test-brabustore-runner-wrapper.sh \
  tests/scripts/test-homelab-workflow.sh
git commit -m "feat: add brabus homelab deploy wrapper"
```

## Task 2: Replace Brabus VPS CI/CD with digest promotion

**Files:**
- Modify: `.github/workflows/build-homelab-image.yml`
- Delete: `.github/workflows/deploy.yml`
- Modify: `docs/DEPLOY.md`
- Test: `tests/scripts/test-homelab-workflow.sh`

**Interfaces:**
- Consumes: `steps.build.outputs.digest` from job `image`.
- Produces: `needs.image.outputs.image`, passed unchanged to `/usr/local/sbin/deploy-brabustore-release`.

- [ ] **Step 1: Run the workflow contract test before changing CI**

Run: `sh tests/scripts/test-homelab-workflow.sh`

Expected: FAIL on the new deploy assertions until the workflow is updated.

- [ ] **Step 2: Add the image job output and deploy job**

Change the `image` job header and append the deployment job in `.github/workflows/build-homelab-image.yml`:

```yaml
  image:
    name: Validate and publish image
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build.outputs.digest }}
```

```yaml
  deploy:
    name: Deploy to Homelab
    needs: image
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: [self-hosted, homelab-brabustore-deploy]
    timeout-minutes: 15
    concurrency:
      group: deploy-brabustore-production
      cancel-in-progress: false
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Promote immutable image
        run: |
          sudo /usr/local/sbin/deploy-brabustore-release \
            "$GITHUB_WORKSPACE" \
            "ghcr.io/melojrx/brabus_store@${{ needs.image.outputs.image }}"
      - name: Record release
        run: |
          {
            printf '%s\n' '### Homelab deployment'
            printf '%s\n' "- Commit: $GITHUB_SHA"
            printf '%s\n' "- Image: ghcr.io/melojrx/brabus_store@${{ needs.image.outputs.image }}"
            printf '%s\n' '- Controller: deploy-brabustore-release'
          } >> "$GITHUB_STEP_SUMMARY"
```

Keep the existing workflow-level build concurrency. Delete `.github/workflows/deploy.yml` so a push cannot reach the VPS.

- [ ] **Step 3: Document the new release path**

Replace the VPS auto-deploy section of `docs/DEPLOY.md` with the exact flow:

```text
push to main -> GitHub-hosted validation -> GHCR digest ->
homelab-brabustore-deploy -> migration -> Swarm rollout -> health verification
```

State that the VPS is recovery-only until Task 8 and that a release uses no
mutable image tag.

- [ ] **Step 4: Verify the changed workflow locally**

Run: `sh tests/scripts/test-homelab-workflow.sh && sh tests/scripts/test-brabustore-deploy-controller.sh && npm run lint -- . && npm test && npm run build`

Expected: exit 0; record any existing lint warning separately.

- [ ] **Step 5: Commit the Brabus workflow migration**

```bash
git add .github/workflows/build-homelab-image.yml \
  .github/workflows/deploy.yml docs/DEPLOY.md
git commit -m "ci: deploy brabus releases to homelab"
```

## Task 3: Persist UrbanLive healthcheck protection and create its wrapper

**Files:**
- Modify: `/home/jrmelo/Projetos/engage_hub_django/deploy/swarm/urbanlive.yml:101-105`
- Modify: `/home/jrmelo/Projetos/engage_hub_django/tests/scripts/test_swarm_healthcheck.sh`
- Create: `/home/jrmelo/Projetos/engage_hub_django/ops/homelab-runner/deploy-urbanlive`
- Create: `/home/jrmelo/Projetos/engage_hub_django/tests/scripts/test_homelab_workflow.sh`

**Interfaces:**
- Consumes: a full UrbanLive GHCR digest and the UrbanLive GitHub runner checkout.
- Produces: a release below `/srv/urbanlive/releases/sha256-<digest>` and invokes `/srv/urbanlive/bin/deploy-stack.sh` with its stack directory.

- [ ] **Step 1: Make the incident regression test fail**

Append to `tests/scripts/test_swarm_healthcheck.sh`:

```sh
if ! grep -Fq -- 'traefik.http.services.urbanlive.loadbalancer.healthcheck.headers.X-Forwarded-Proto=https' \
  "$REPOSITORY_ROOT/deploy/swarm/urbanlive.yml"; then
  echo "Traefik healthcheck must preserve the HTTPS protocol header" >&2
  exit 1
fi
```

Run: `sh tests/scripts/test_swarm_healthcheck.sh`

Expected: FAIL until the source manifest contains the header.

- [ ] **Step 2: Persist the UrbanLive Traefik header**

Add this line immediately after the existing Traefik `headers.Host` label in
`deploy/swarm/urbanlive.yml`:

```yaml
        - traefik.http.services.urbanlive.loadbalancer.healthcheck.headers.X-Forwarded-Proto=https
```

- [ ] **Step 3: Create the UrbanLive root-wrapper source**

Create `ops/homelab-runner/deploy-urbanlive`:

```sh
#!/bin/sh
set -eu

URBANLIVE_ROOT='/srv/urbanlive'
checkout=${1:?Usage: deploy-urbanlive <checkout> <image-digest>}
image=${2:?Usage: deploy-urbanlive <checkout> <image-digest>}

case "$checkout" in
  /opt/actions-runner-urbanlive/_work/engage_hub_django/engage_hub_django) ;;
  *) printf '%s\n' 'Invalid UrbanLive checkout path.' >&2; exit 1 ;;
esac

. "$checkout/scripts/homelab/load-env.sh"
validate_urbanlive_image "$image"

for file in deploy/swarm/edge.yml deploy/swarm/urbanlive.yml \
  deploy/swarm/urbanlive.env.example scripts/homelab/load-env.sh \
  scripts/homelab/deploy-stack.sh; do
  test -f "$checkout/$file" || { printf 'Required release file is missing: %s\n' "$file" >&2; exit 1; }
done

digest=${image#ghcr.io/melojrx/engage_hub_django@sha256:}
release_directory="$URBANLIVE_ROOT/releases/sha256-$digest"
install -d -m 0750 -o root -g root "$release_directory"
tar -C "$checkout" -cf - deploy/swarm scripts/homelab | tar -xf - -C "$release_directory"
install -m 0755 "$release_directory/scripts/homelab/load-env.sh" "$URBANLIVE_ROOT/bin/load-env.sh"
install -m 0755 "$release_directory/scripts/homelab/deploy-stack.sh" "$URBANLIVE_ROOT/bin/deploy-stack.sh"
exec "$URBANLIVE_ROOT/bin/deploy-stack.sh" "$release_directory/deploy/swarm" "$image"
```

- [ ] **Step 4: Add static wrapper/workflow tests**

Create `tests/scripts/test_homelab_workflow.sh`:

```sh
#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
workflow="$root/.github/workflows/deploy.yml"
wrapper="$root/ops/homelab-runner/deploy-urbanlive"

grep -Fq 'outputs:' "$workflow"
grep -Fq 'image: ${{ steps.build-push.outputs.digest }}' "$workflow"
grep -Fq 'needs: build' "$workflow"
grep -Fq '[self-hosted, homelab-urbanlive-deploy]' "$workflow"
grep -Fq 'group: deploy-urbanlive-production' "$workflow"
grep -Fq 'cancel-in-progress: false' "$workflow"
grep -Fq "URBANLIVE_ROOT='/srv/urbanlive'" "$wrapper"
grep -Fq 'validate_urbanlive_image "$image"' "$wrapper"
grep -Fq '"$URBANLIVE_ROOT/bin/deploy-stack.sh" "$release_directory/deploy/swarm" "$image"' "$wrapper"
! grep -Eq '(^|[[:space:]])(git pull|git fetch|docker build)' "$wrapper"
```

Run: `sh tests/scripts/test_swarm_healthcheck.sh && sh tests/scripts/test_homelab_workflow.sh && sh -n ops/homelab-runner/deploy-urbanlive`

Expected: exit 0.

- [ ] **Step 5: Commit the UrbanLive manifest and wrapper**

```bash
git add deploy/swarm/urbanlive.yml tests/scripts/test_swarm_healthcheck.sh \
  tests/scripts/test_homelab_workflow.sh ops/homelab-runner/deploy-urbanlive
git commit -m "fix: persist urbanlive Traefik health header"
```

## Task 4: Add UrbanLive digest promotion to CI

**Files:**
- Modify: `/home/jrmelo/Projetos/engage_hub_django/.github/workflows/deploy.yml`
- Modify: `/home/jrmelo/Projetos/engage_hub_django/docs/DEPLOY.md`
- Test: `/home/jrmelo/Projetos/engage_hub_django/tests/scripts/test_homelab_workflow.sh`

**Interfaces:**
- Consumes: `steps.build-push.outputs.digest` from job `build`.
- Produces: `needs.build.outputs.image`, passed as a full UrbanLive image reference to the root-owned wrapper.

- [ ] **Step 1: Expose the build digest as a job output**

Add to the `build` job:

```yaml
    outputs:
      image: ${{ steps.build-push.outputs.digest }}
```

- [ ] **Step 2: Append the guarded UrbanLive deployment job**

```yaml
  deploy:
    name: Deploy to Homelab
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: [self-hosted, homelab-urbanlive-deploy]
    timeout-minutes: 15
    concurrency:
      group: deploy-urbanlive-production
      cancel-in-progress: false
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Promote immutable image
        run: |
          sudo /usr/local/sbin/deploy-urbanlive-release \
            "$GITHUB_WORKSPACE" \
            "ghcr.io/melojrx/engage_hub_django@${{ needs.build.outputs.image }}"
      - name: Record release
        run: |
          {
            printf '%s\n' '### Homelab deployment'
            printf '%s\n' "- Commit: $GITHUB_SHA"
            printf '%s\n' "- Image: ghcr.io/melojrx/engage_hub_django@${{ needs.build.outputs.image }}"
            printf '%s\n' '- Controller: deploy-urbanlive-release'
          } >> "$GITHUB_STEP_SUMMARY"
```

- [ ] **Step 3: Document the release contract**

Create or extend `docs/DEPLOY.md` to state that pull requests run tests only,
while a successful `main` build publishes and promotes exactly one digest.
Include the public verification commands:

```bash
curl --fail --silent --show-error https://urbanlive.com.br/api/v1/health/liveness/
curl --fail --silent --show-error https://urbanlive.com.br/api/v1/health/readiness/
```

- [ ] **Step 4: Run full UrbanLive validation**

Run: `sh tests/scripts/test_swarm_healthcheck.sh && sh tests/scripts/test_homelab_load_env.sh && sh tests/scripts/test_homelab_workflow.sh && python manage.py test --verbosity=2 && python manage.py check --deploy`

Expected: exit 0.

- [ ] **Step 5: Commit the UrbanLive CI/CD update**

```bash
git add .github/workflows/deploy.yml docs/DEPLOY.md
git commit -m "ci: deploy urbanlive releases to homelab"
```

## Task 5: Provision the two restricted Homelab runner agents

**Files:**
- Create on Homelab: `/usr/local/sbin/deploy-brabustore-release`
- Create on Homelab: `/usr/local/sbin/deploy-urbanlive-release`
- Create on Homelab: `/etc/sudoers.d/80-runner-brabustore-deploy`
- Create on Homelab: `/etc/sudoers.d/80-runner-urbanlive-deploy`
- Create on Homelab: `/etc/systemd/system/actions.runner.brabustore.service`
- Create on Homelab: `/etc/systemd/system/actions.runner.urbanlive.service`

**Interfaces:**
- Consumes: a checked-out repository workspace and an immutable digest from its matching GitHub workflow.
- Produces: only that application's controller execution with root privileges.

- [ ] **Step 1: Create isolated local identities and runner directories**

Run on the Homelab:

```bash
sudo useradd --system --create-home --home-dir /home/runner-brabustore --shell /usr/sbin/nologin runner-brabustore
sudo useradd --system --create-home --home-dir /home/runner-urbanlive --shell /usr/sbin/nologin runner-urbanlive
sudo install -d -o runner-brabustore -g runner-brabustore -m 0750 /opt/actions-runner-brabustore
sudo install -d -o runner-urbanlive -g runner-urbanlive -m 0750 /opt/actions-runner-urbanlive
```

Expected: two non-login accounts and two separate runner work roots.

- [ ] **Step 2: Install reviewed wrapper files as root-owned executables**

From each reviewed repository checkout, run:

```bash
sudo install -o root -g root -m 0750 ops/homelab-runner/deploy-brabustore /usr/local/sbin/deploy-brabustore-release
sudo install -o root -g root -m 0750 ops/homelab-runner/deploy-urbanlive /usr/local/sbin/deploy-urbanlive-release
```

Verify: `sudo sha256sum /usr/local/sbin/deploy-brabustore-release /usr/local/sbin/deploy-urbanlive-release` and record the two checksums in the release evidence.

- [ ] **Step 3: Install command-specific sudo policies**

Write `/etc/sudoers.d/80-runner-brabustore-deploy`:

```sudoers
Defaults:runner-brabustore !requiretty
runner-brabustore ALL=(root) NOPASSWD: /usr/local/sbin/deploy-brabustore-release /opt/actions-runner-brabustore/_work/brabus_store/brabus_store *, *
```

Write `/etc/sudoers.d/80-runner-urbanlive-deploy`:

```sudoers
Defaults:runner-urbanlive !requiretty
runner-urbanlive ALL=(root) NOPASSWD: /usr/local/sbin/deploy-urbanlive-release /opt/actions-runner-urbanlive/_work/engage_hub_django/engage_hub_django *, *
```

Run: `sudo visudo -cf /etc/sudoers.d/80-runner-brabustore-deploy && sudo visudo -cf /etc/sudoers.d/80-runner-urbanlive-deploy`

Expected: both files parse successfully.

- [ ] **Step 4: Register each runner to only its matching private repository**

In GitHub repository settings, generate a one-hour runner registration token for
the matching repository. On the Homelab, download the current GitHub Actions
runner release into each `/opt/actions-runner-*` directory, then run:

```bash
sudo -u runner-brabustore ./config.sh --unattended --url https://github.com/melojrx/brabus_store --token "$REGISTRATION_TOKEN" --name homelab-brabustore-deploy --labels homelab-brabustore-deploy --work _work
sudo -u runner-urbanlive ./config.sh --unattended --url https://github.com/melojrx/engage_hub_django --token "$REGISTRATION_TOKEN" --name homelab-urbanlive-deploy --labels homelab-urbanlive-deploy --work _work
```

Use distinct, short-lived `REGISTRATION_TOKEN` shell variables and unset each
immediately after registration. Do not store them in files, shell history, or
GitHub repository secrets.

- [ ] **Step 5: Install and start the two systemd services**

Create `/etc/systemd/system/actions.runner.brabustore.service`:

```ini
[Unit]
Description=GitHub Actions runner for Brabus Homelab deploys
After=network-online.target docker.service
Wants=network-online.target

[Service]
User=runner-brabustore
WorkingDirectory=/opt/actions-runner-brabustore
ExecStart=/opt/actions-runner-brabustore/run.sh
Restart=always
RestartSec=5
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Create the UrbanLive unit with `runner-urbanlive` and
`/opt/actions-runner-urbanlive` in the equivalent fields.

Run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now actions.runner.brabustore.service actions.runner.urbanlive.service
sudo systemctl is-active actions.runner.brabustore.service actions.runner.urbanlive.service
```

Expected: both services report `active`; GitHub repository settings show each
matching runner as `Idle`.

- [ ] **Step 6: Commit the runner source in each repository**

The source wrappers were committed in Tasks 1 and 3. Record the Homelab
installation SHA and checksums in each repository's release documentation; do
not commit host-specific runner tokens or sudoers files.

## Task 6: Validate automated releases without touching the VPS

**Files:**
- Modify: Brabus and UrbanLive release documentation only if command output differs from the documented contract.

**Interfaces:**
- Consumes: the first `main` commits containing the workflow changes.
- Produces: one verified digest and public health result per application.

- [ ] **Step 1: Confirm runner isolation before push**

Run on Homelab:

```bash
sudo -u runner-brabustore sudo -n /usr/local/sbin/deploy-urbanlive-release /tmp invalid-image && exit 1 || true
sudo -u runner-urbanlive sudo -n /usr/local/sbin/deploy-brabustore-release /tmp invalid-image && exit 1 || true
```

Expected: both cross-application calls are denied by sudo before either wrapper executes.

- [ ] **Step 2: Push the Brabus CI/CD commit and observe only Brabus**

Run from the Brabus checkout:

```bash
git push origin main
gh run watch --exit-status
```

Then verify:

```bash
curl --fail --silent --show-error https://brabustore.com.br/api/health
ssh melojr@100.93.170.120 'sudo docker service inspect brabustore_web --format "{{.Spec.TaskTemplate.ContainerSpec.Image}}"; sudo docker service ps urbanlive_web --format "{{.CurrentState}}" | head -1'
```

Expected: Brabus reports the newly published digest; UrbanLive remains running
without a new task.

- [ ] **Step 3: Push the UrbanLive CI/CD and health-header commit and observe only UrbanLive**

Run from the UrbanLive checkout:

```bash
git push origin main
gh run watch --exit-status
```

Then verify:

```bash
curl --fail --silent --show-error https://urbanlive.com.br/api/v1/health/liveness/
curl --fail --silent --show-error https://urbanlive.com.br/api/v1/health/readiness/
ssh melojr@100.93.170.120 'sudo docker service inspect urbanlive_web --format "{{index .Spec.TaskTemplate.ContainerSpec.Labels \"traefik.http.services.urbanlive.loadbalancer.healthcheck.headers.X-Forwarded-Proto\"}}"; sudo docker service ps brabustore_web --format "{{.CurrentState}}" | head -1'
```

Expected: UrbanLive returns public success and has the persisted Traefik label;
Brabus remains running without a new task.

- [ ] **Step 4: Capture release evidence**

For each workflow, save the GitHub run URL, commit SHA, immutable image digest,
migration completion, Swarm service image, public health response, and the
absence of a cross-application update in its operational documentation.

## Task 7: Remove obsolete Brabus VPS automation access

**Files:**
- Modify: `/home/jrmelo/Projetos/brabus_store/docs/DEPLOY.md`
- Modify: Brabus operational Obsidian note after live validation

**Interfaces:**
- Consumes: successful evidence from Task 6.
- Produces: no GitHub workflow or repository secret capable of deploying Brabus to the VPS.

- [ ] **Step 1: Confirm no workflow references VPS deployment credentials**

Run: `rg -n 'VPS_HOST|VPS_DEPLOY_KEY|srv/apps/brabustore' .github scripts docs`

Expected: documentation may describe recovery history, but no executable
workflow or script references the credentials.

- [ ] **Step 2: Remove the two Brabus repository secrets in GitHub**

Run:

```bash
gh secret delete VPS_DEPLOY_KEY
gh secret delete VPS_HOST
gh secret list
```

Expected: neither deleted secret appears; package publishing still uses the
ephemeral `GITHUB_TOKEN`.

- [ ] **Step 3: Update operational documentation**

Record the VPS as recovery-only and state that it is intentionally retained,
not a release target. Include the final VPS commit, database order count, and
backup location reference without storing backup credentials.

## Task 8: Stop Brabus application runtime on the VPS after recovery gates

**Files:**
- Modify: Brabus operational Obsidian note after validated shutdown.

**Interfaces:**
- Consumes: Tasks 6 and 7 plus a verified Homelab backup/restore evidence set.
- Produces: stopped VPS Brabus `app` and `db` containers with named volumes preserved.

- [ ] **Step 1: Verify shutdown preconditions**

Confirm all of the following in the release record: automatic Brabus Homelab
promotion passed, public health is green, the Homelab database/uploads backup
restored in isolation, and a final VPS database/uploads backup exists.

Run:

```bash
ssh root@38.52.128.62 'cd /srv/apps/brabustore && docker compose -f docker-compose.vps.yml --env-file .env.production ps'
ssh melojr@100.93.170.120 'sudo docker service ls --format "{{.Name}} {{.Replicas}}" | grep "^brabustore_"'
```

Expected: VPS app/db are still available for the controlled stop; Homelab web
and database are `1/1`.

- [ ] **Step 2: Stop, but do not delete, the VPS application and database**

Run:

```bash
ssh root@38.52.128.62 'cd /srv/apps/brabustore && docker compose -f docker-compose.vps.yml --env-file .env.production stop app db && docker compose -f docker-compose.vps.yml --env-file .env.production ps'
```

Expected: `app` and `db` are stopped; no `down`, `rm`, `volume rm`, or image
prune command is used.

- [ ] **Step 3: Verify public service remains on Homelab**

Run:

```bash
curl --fail --silent --show-error https://brabustore.com.br/api/health
curl --fail --silent --show-error https://www.brabustore.com.br/api/health
ssh melojr@100.93.170.120 'sudo docker service ls --format "{{.Name}} {{.Replicas}}" | grep "^brabustore_"'
```

Expected: both public health requests succeed and Homelab Brabus services are
healthy; the VPS remains stopped.

- [ ] **Step 4: Record the recovery retention boundary**

Document the stop timestamp, final VPS backup identifier, Homelab release
digest, volume names retained on the VPS, and an explicit retention review
date. Do not remove the VPS data in this task.

## Task 9: Onboard FinanPy only after its repository is identified

**Files:**
- Create in the FinanPy repository: an application-specific release workflow, `ops/homelab-runner/deploy-finanpy`, deployment controller tests, and operational deploy documentation.
- Create on Homelab: `/usr/local/sbin/deploy-finanpy-release`, a dedicated `runner-finanpy` account, runner registration, sudoers policy, and systemd unit.

**Interfaces:**
- Consumes: FinanPy repository URL, runtime health endpoint, migration command, image repository name, stack prefix, release root, networks, volumes, secrets, and Cloudflare Tunnel name.
- Produces: an isolated `finanpy` deploy pipeline using the same immutable-digest contract.

- [ ] **Step 1: Capture FinanPy's application contract before creating resources**

Record its repository URL, GHCR image name, stack prefix `finanpy`, release root
`/srv/finanpy`, public liveness/readiness URLs, database migration mechanism,
state services, named volumes, external secrets, and Cloudflare Tunnel. Reject
the onboarding if any resource name overlaps Brabus or UrbanLive.

- [ ] **Step 2: Copy the contract, not application implementation**

Create FinanPy's wrapper and workflow following Tasks 1–5, replacing only the
application-specific digest validator, source files, service names, migration
job, and health endpoints. Its runner label must be
`homelab-finanpy-deploy` and its concurrency group
`deploy-finanpy-production`.

- [ ] **Step 3: Prove isolation with an initial release**

Publish one FinanPy `main` release, confirm only `finanpy_*` services change,
then query Brabus and UrbanLive public health endpoints and service task times.

## Task 10: Implement the approved external backup backlog after all pipelines are stable

**Files:**
- Create: per-application backup and restore scripts in each repository.
- Create: private Cloudflare R2 bucket configuration and scheduler units on Homelab.
- Modify: each operational runbook with restore evidence and retention handling.

**Interfaces:**
- Consumes: each application's internal PostgreSQL access, media volume, private R2 credentials, and per-application retention prefix.
- Produces: encrypted, checksummed database/uploads backups, an isolated restore verification result, and 30-day retention.

- [ ] **Step 1: Start only after Tasks 6 and 9 have passed for all three applications**

Confirm three independent automated promotion records and public health checks.
Do not provision the R2 bucket or credentials before this gate.

- [ ] **Step 2: Implement per-application backup prefixes and restore tests**

Use separate R2 prefixes `brabustore/`, `urbanlive/`, and `finanpy/`; write a
completion marker only after database dump, media archive, and SHA-256 manifest
uploads succeed. Restore each backup into an isolated temporary database and
verify expected aggregate counts before marking the backup valid.

- [ ] **Step 3: Enable 30-day retention and record evidence**

Apply the R2 lifecycle rule for 30 days, schedule each backup independently,
and document bucket policy, last successful backup timestamp, checksum result,
and restore result without recording credentials.

## Plan Review

- Spec coverage: Tasks 1–6 implement independent runners, workflows, digest
  promotion, healthchecks, rollout, rollback, and isolation. Tasks 7–8 remove
  Brabus VPS deployment and runtime only after recovery gates. Task 9 onboards
  FinanPy without guessing its repository contract. Task 10 records the
  approved deferred R2 backlog.
- Completeness check: the plan uses no mutable image tags, secret values,
  unbounded deployment permissions, destructive volume commands, or unnamed
  health checks.
- Consistency: Brabus uses `/srv/brabustore` and `brabustore_*`; UrbanLive uses
  `/srv/urbanlive` and `urbanlive_*`; all workflow digests are passed unchanged
  to their matching wrapper/controller.
