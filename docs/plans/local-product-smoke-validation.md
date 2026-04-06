# Local Product Smoke Validation

## Issue
- #119 — Validate local end-to-end product flow after auth and database bootstrap

## Goal
Validate that the local ForgeOps stack can run the current product slice end to end with:
- database bootstrap working
- operator auth working
- backend protected routes reachable
- frontend reachable through the local proxy

## Runtime used
- Docker Compose local stack
- `FORGEOPS_PROXY_PORT=8082`
- `TRAEFIK_DOCKER_PROVIDER_ENABLED=false`
- `OPERATOR_AUTH_ENABLED=true`
- `OPERATOR_AUTH_MODE=shared-secret`
- `OPERATOR_AUTH_ISSUER=forgeops-local`
- `OPERATOR_AUTH_AUDIENCE=forgeops-operator`

## Validation summary

### Infrastructure
- PostgreSQL healthy
- Redis healthy
- Backend healthy
- Frontend healthy
- Traefik proxy healthy
- Proxy liveness confirmed through `/ping`

### Auth
- `GET /api/v1/auth/me` returned `200` with a valid local HS256 bearer token
- Protected API no longer degraded to `auth_not_configured`

### Database
- Prisma migration status returned `Database schema is up to date!`

### Backend slice
- `GET /api/v1/repositories` returned `200`
- `GET /api/v1/repositories/repo_smoke_1/workflows` returned `200`
- `GET /api/v1/repositories/repo_smoke_1/workflows/wf_smoke_1/runs` returned `200`
- `GET /api/v1/repositories/repo_smoke_1/workflows/wf_smoke_1/runs/run_smoke_1` returned `200`
- `GET /api/v1/repositories/repo_smoke_1/pull-requests` returned `200`
- `GET /api/v1/repositories/repo_smoke_1/pull-requests/pr_smoke_1` returned `200`

The validated data came from the local smoke dataset already present in the database:
- repository `repo_smoke_1`
- workflow `wf_smoke_1`
- workflow run `run_smoke_1`
- workflow job `job_smoke_1`
- pull request `pr_smoke_1`
- codex review summary linked to the pull request

### Frontend through proxy
- `GET /` via `forgeops.local` returned `200`
- `GET /repositories` via `forgeops.local` returned `200`

## Known limitations after validation
- Real repository discovery via GitHub App is still a separate follow-up.
- The route `GET /api/v1/repositories/discovery` currently does not participate in this smoke validation outcome.
- End-to-end onboarding with a real GitHub installation remains tracked separately in #122.

## Conclusion
The local product flow is executable for the current monitored repository slice once:
- auth is configured
- migrations are applied
- the local proxy is healthy

The remaining gap is not in the core monitored repository slice; it is in local GitHub App-backed discovery onboarding.
