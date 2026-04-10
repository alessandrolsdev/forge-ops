# Local GitHub App Discovery Validation

## Issue
- #122 — Validate local repository discovery flow with GitHub App configuration

## Goal
Validate the real local onboarding flow with a configured GitHub App, without relying on manually seeded repository data.

This validation targets:
- `GET /api/v1/repositories/discovery`
- `POST /api/v1/repositories`
- `GET /api/v1/repositories/:repositoryId/workflows`

## Runtime used
- Docker Compose local stack
- Backend configured with a real GitHub App:
  - `GITHUB_APP_ID`
  - `GITHUB_APP_INSTALLATION_ID`
  - `GITHUB_APP_PRIVATE_KEY`
  - `GITHUB_APP_WEBHOOK_SECRET`
- Local operator auth enabled in `shared-secret` mode for smoke validation:
  - `OPERATOR_AUTH_ENABLED=true`
  - `OPERATOR_AUTH_MODE=shared-secret`
  - `OPERATOR_AUTH_ISSUER=forgeops-local`
  - `OPERATOR_AUTH_AUDIENCE=forgeops-operator`
  - `OPERATOR_AUTH_SHARED_SECRET=<local-secret>`

## Validation result in this workspace

### Backend bootstrap
- `GET /api/v1/health` returned `200`
- GitHub integration status reported:
  - `mode: github-app`
  - `configured: true`
  - masked `appId`
  - masked `installationId`
  - `webhookConfigured: true`

This confirms the backend accepts the configured GitHub App credentials in the local runtime.

### Discovery
- `GET /api/v1/repositories/discovery` returned `200`
- The current installation returned one repository:
  - `alessandrolsdev/forge-ops`

This confirms local discovery works with the real GitHub App configuration.

### Onboarding behavior
The repository returned by discovery is already monitored in the current local database state.

Current rerun result:
- `POST /api/v1/repositories` returned `409`
- error code: `repository_already_exists`
- message: `Repository is already monitored.`

This is an expected business result for the reused local database, not a GitHub App configuration failure.

### Workflow catalog after discovery/onboarding
- `GET /api/v1/repositories/:repositoryId/workflows` returned `200`
- The monitored repository returned `6` workflows

This confirms the repository currently exposed by discovery is usable by the product slice after onboarding.

## Prior clean onboarding evidence
Before the repository became persisted in the current local database, this workspace already validated real onboarding with the same GitHub App integration:
- `POST /api/v1/repositories` returned `201`
- workflow catalog sync succeeded
- repository ingestion succeeded

That clean-run evidence was captured during the workflow catalog sync investigation tracked by #125 / PR #126.

## Reproducible validation checklist
To repeat the full flow locally:

1. Configure valid `GITHUB_APP_*` values.
2. Enable local operator auth in `shared-secret` mode.
3. Start `postgres`, `redis` and `backend`.
4. Generate a local operator token with `repositories:write`.
5. Call `GET /api/v1/repositories/discovery`.
6. If the discovered repository is not yet monitored, call `POST /api/v1/repositories`.
7. Call `GET /api/v1/repositories/:repositoryId/workflows` for the monitored repository.

## Current limitations
- The current GitHub App installation returns only one repository in this workspace.
- That same repository is already persisted in the local database, so repeated runs naturally hit `repository_already_exists`.
- A fully repeatable `201 Created` rerun requires either:
  - a clean local database, or
  - at least one additional repository available in the GitHub App installation

## Conclusion
The issue objective is satisfied:
- local GitHub App bootstrap is valid
- local discovery works
- local onboarding has been validated with a real GitHub App configuration
- the remaining limitation is repeatability on a reused local database, not product wiring

The local onboarding path no longer depends on fake data or product-side bypasses.
