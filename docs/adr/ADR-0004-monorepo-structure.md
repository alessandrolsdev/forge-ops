# ADR-0004: Establish a two-app monorepo with explicit boundaries

**Status:** Accepted

## Context
ForgeOps needs a web application, an API, repository automation, and shared quality tooling. The repository currently lacks any implementation structure.

## Decision
Adopt a monorepo with `frontend/`, `backend/`, `.github/`, `docs/`, and minimal shared configuration packages. The frontend uses feature-oriented organization. The backend uses layered modules with app, modules, infra, and shared directories.

## Consequences
- Positive: clear ownership boundaries between UI, domain logic, and integrations.
- Positive: quality and automation can be centralized at the repository root.
- Negative: developers must stay disciplined to avoid leaking runtime contracts into shared packages too early.

## Alternatives Discarded
- Separate repositories per app: rejected because it would weaken shared automation and synchronized governance work.
