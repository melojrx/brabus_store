# Shared Homelab Deployment Automation Design

## Goal

Make Brabus Store, UrbanLive, and FinanPy independently deployable to the
Homelab from a successful `main` pipeline, while retiring application runtime
from the Brabus VPS without sharing application data, releases, or credentials.

## Scope

This is a platform contract used by three separate repositories:

| Application | Repository | Runtime |
| --- | --- | --- |
| Brabus Store | `melojrx/brabus_store` | Next.js, Prisma, PostgreSQL, scheduler |
| UrbanLive | `melojrx/engage_hub_django` | Django, PostgreSQL, Redis, migration job |
| FinanPy | repository to be confirmed at implementation time | application-specific |

Each application keeps its own stack, database, volumes, secrets, Cloudflare
Tunnel, health endpoints, deployment workflow, release history, and rollback.
No deploy job may inspect or update another application's Docker services.

## Architecture

```text
main push (one repository)
  -> GitHub-hosted CI: lint, tests, application checks, image build
  -> GHCR: immutable linux/amd64 image identified by digest
  -> repository-scoped deployment agent on Homelab
  -> application deployment controller
  -> migration, start-first web update, readiness verification, rollback
```

The CI build runs on GitHub-hosted runners. The Homelab only receives an image
by complete GHCR digest and versioned deployment manifests. It never builds an
application image or runs `git pull` for a release.

## Deployment Agents

The Homelab runs one GitHub Actions self-hosted agent registration per
repository, each with a distinct label and service account. A repository's
deployment job targets only its own label.

Each service account is restricted to a root-owned wrapper for that
application's deployment controller. The wrapper accepts a full, validated
GHCR image digest and invokes only the matching controller/release directory:

| Application | Stack prefix | Release root | Agent label |
| --- | --- | --- | --- |
| Brabus Store | `brabustore` | `/srv/brabustore` | `homelab-brabustore-deploy` |
| UrbanLive | `urbanlive` | `/srv/urbanlive` | `homelab-urbanlive-deploy` |
| FinanPy | `finanpy` | `/srv/finanpy` | `homelab-finanpy-deploy` |

The agents accept jobs only from their assigned private repository. Pull
requests, forks, arbitrary shell dispatch inputs, personal access tokens, and
shared SSH keys are out of scope for deployment access.

## Workflow Contract

Every repository has a single release workflow for `main`:

1. Run application-specific validation.
2. Build and publish one `linux/amd64` image to GHCR tagged by commit SHA.
3. Export the resulting immutable digest as a job output.
4. Run a deploy job only after the image job succeeds and only for `main`.
5. Pass the digest as data, never reconstruct it from a mutable tag.
6. Serialize deployments with a concurrency group scoped to that application;
   queued releases must not be cancelled.
7. Record commit SHA, image digest, migration result, service state, and public
   health result in the GitHub job summary.

The Brabus `Deploy to VPS` workflow is removed. No workflow may use
`VPS_HOST` or `VPS_DEPLOY_KEY` after the Homelab release path is validated.

## Deployment Controller Contract

Each application retains a versioned controller, adapted only for its stack:

1. Validate the full image reference and release directory.
2. Validate required networks and external Docker secrets.
3. Stage only that repository's deployment files below its release root.
4. Run its one-shot migration service from the same image.
5. Deploy the stack with `start-first`, health monitoring, and rollback for the
   web service.
6. Verify an internal readiness request with the host and forwarded-protocol
   headers required by the application.
7. Verify the public liveness/readiness endpoint after tunnel and Traefik
   convergence.

Schema migrations must be backward compatible with the previously deployed
web version. Destructive or contract-breaking migrations require a separate,
approved expand/contract release.

## Network, Data, and Secret Isolation

Every application uses:

- a unique Swarm stack prefix;
- a dedicated private backend network;
- dedicated named database/media volumes;
- dedicated Docker secrets with application-specific names;
- a dedicated Cloudflare Tunnel and public route;
- only its web service on the shared `edge` network.

PostgreSQL, Redis, and other state services do not publish host ports or join
the `edge` network. A controller never copies data or volumes between stacks.

## Healthcheck Standard

Container healthchecks and Traefik load-balancer healthchecks are separate
contracts. When an application requires a host or protocol header, both checks
must explicitly send it.

UrbanLive's source manifest must include:

```yaml
- traefik.http.services.urbanlive.loadbalancer.healthcheck.headers.X-Forwarded-Proto=https
```

Brabus keeps its container healthcheck with `Host` and
`X-Forwarded-Proto: https`. If a Traefik load-balancer healthcheck is added in
the future, it must include the same header contract.

## Backup and Retention

Before retiring a runtime or applying a release with a non-trivial migration,
the application must have a verified backup of its PostgreSQL data and uploaded
media. A backup is valid only after checksum verification and a restore test in
an isolated target.

The external-backup backlog uses a private Cloudflare R2 bucket with encrypted
transport, checksums, restore verification, and a 30-day retention policy.
Provisioning the bucket, credentials, scheduled jobs, and restore exercises is
explicitly deferred until Brabus, UrbanLive, and FinanPy are running through
their validated Homelab pipelines.

## Brabus VPS Retirement

The VPS remains a read-only recovery artifact through the pipeline rollout and
until all of these gates pass:

1. The Homelab workflow has promoted a validated Brabus release automatically.
2. Public health and functional checks use the Homelab release.
3. Homelab database and uploads backups have passed restore verification.
4. A final VPS database/uploads backup has been created and verified.
5. The known Homelab data lead over the VPS has been recorded; VPS data is not
   copied back without a reconciliation plan.

Only then stop the Brabus Compose app and database on the VPS. Preserve its
volumes, checkout, and backup for the agreed retention window; do not remove
them during this rollout.

## Non-Goals

- Multi-node high availability.
- Shared application databases, volumes, tunnels, or secrets.
- Public SSH access to the Homelab.
- Automatic production deployment from pull requests or forks.
- Moving application business logic between Django and Next.js.

## Success Criteria

- A `main` release of one application updates only its matching Homelab stack.
- A failed migration or readiness check leaves the prior web release available.
- Brabus and UrbanLive versioned manifests preserve their required healthcheck
  headers across a `docker stack deploy`.
- The Brabus VPS no longer runs its application services or receives automated
  deploys, while a verified recovery backup remains available.
- FinanPy can adopt the same contract without modifying Brabus or UrbanLive.
