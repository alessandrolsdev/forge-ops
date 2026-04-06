# Local GitHub App Discovery Validation

## Issue
- #122 — Validate local repository discovery flow with GitHub App configuration

## Goal
Validate the real local onboarding flow without relying on manually seeded repository data.

This validation targets:
- `GET /api/v1/repositories/discovery`
- `POST /api/v1/repositories`

## Smallest viable strategy
Use the existing local stack with:
- database already migrated
- operator auth enabled with local shared-secret mode
- proxy stable through `forgeops.local` and `api.forgeops.local`
- real GitHub App configuration injected into the backend runtime

No product fallback or insecure bypass is required for this flow. The missing dependency is a valid local GitHub App configuration.

## Required local configuration
The backend requires all of these variables with valid values:
- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_WEBHOOK_SECRET`

Local auth still requires:
- `OPERATOR_AUTH_ENABLED=true`
- `OPERATOR_AUTH_MODE=shared-secret`
- `OPERATOR_AUTH_ISSUER=forgeops-local`
- `OPERATOR_AUTH_AUDIENCE=forgeops-operator`
- `OPERATOR_AUTH_SHARED_SECRET=<local-secret>`

## Current result in this workspace
The current local `.env` does not provide GitHub App credentials.

Observed state:
- `GITHUB_APP_ID` missing
- `GITHUB_APP_INSTALLATION_ID` missing
- `GITHUB_APP_PRIVATE_KEY` missing
- `GITHUB_APP_WEBHOOK_SECRET` missing

## Behavior validated without GitHub App config
With the local stack healthy and operator auth enabled:

- `GET /api/v1/repositories/discovery`
  - backend response: `500`
  - error code: `github_app_not_configured`

- `POST /api/v1/repositories`
  - backend response: `500`
  - sync failure logs:
    - `workflow_catalog_sync_failed`
    - `repository_ingestion_failed`
  - both failures resolve to `github_app_not_configured`

This confirms the remaining blocker is configuration, not auth, migrations, proxy or route availability.

## Reproducible validation checklist
Once valid GitHub App credentials are available locally:

1. Export the required `GITHUB_APP_*` variables.
2. Recreate the backend container with the configured environment.
3. Verify backend health.
4. Call `GET /api/v1/repositories/discovery` through `api.forgeops.local`.
5. Confirm discovery returns installation repositories instead of `github_app_not_configured`.
6. Call `POST /api/v1/repositories` with a repository returned by discovery.
7. Confirm repository creation succeeds without manual database seed.
8. Validate the frontend onboarding flow against the same configured backend.

## Commands used for the blocked validation
- `docker compose up -d --force-recreate backend frontend proxy`
- `GET /api/v1/repositories/discovery` via `api.forgeops.local`
- `POST /api/v1/repositories` via `api.forgeops.local`

## Conclusion
The issue is not fully closed in this workspace yet.

The current diagnosis is precise:
- local auth works
- local database works
- proxy works
- onboarding discovery remains blocked only by missing GitHub App credentials

The next valid step is to rerun the checklist with a real local GitHub App configuration.
