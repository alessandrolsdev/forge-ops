# Monorepo Boundaries

## Apps
- `frontend` owns the operator experience, data fetching orchestration, and presentation state.
- `backend` owns HTTP contracts, domain logic, persistence, audit, and external integrations.

## Shared Packages
- `packages/tsconfig` centralizes strict TypeScript baselines.
- `packages/eslint-config` centralizes lint rules for root, backend, and frontend.
- No shared runtime code is allowed in `packages/` during the foundation milestone.

## Integration Rules
- `frontend` may depend on public backend HTTP endpoints only.
- `backend` must isolate providers under `src/infra` or module-specific `providers`.
- Providers expose internal interfaces so integrations can be mocked in tests.

## Expansion Triggers
- Extract a package only when at least two workspaces depend on the same artifact.
- Write an ADR before introducing a new shared runtime package or cross-cutting infrastructure.

