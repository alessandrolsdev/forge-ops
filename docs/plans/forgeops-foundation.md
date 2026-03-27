# ForgeOps Foundation Plan

## Summary
- Bootstrap the monorepo with `frontend`, `backend`, and minimal shared configuration packages.
- Keep shared code out of `packages/` until at least two consumers need the same artifact.
- Establish quality gates, local infrastructure, and integration boundaries before product features.

## Decisions
- `main` is the trunk branch for the bootstrap stage.
- `pnpm` and `turbo` are the workspace orchestrators.
- `frontend` uses Next.js App Router with explicit API boundaries.
- `backend` uses Fastify with layered modules and isolated providers.
- GitHub integration defaults to a GitHub App boundary, not PAT-based direct calls.

## Execution Order
1. Create architectural documentation and ADRs.
2. Bootstrap the root workspace and shared config packages.
3. Scaffold backend and frontend applications.
4. Configure lint, typecheck, tests, and repository automation.
5. Add local infrastructure and persistence baseline.
6. Define the GitHub App provider boundary.

## Acceptance Criteria
- Root workspace runs `lint`, `typecheck`, and `test`.
- `frontend` and `backend` are valid workspaces with dedicated scripts.
- Shared config exists only in `packages/tsconfig` and `packages/eslint-config`.
- CI validates pull requests against the same root commands used locally.
- Docker Compose provisions PostgreSQL and Redis without hardcoded secrets.
- GitHub App boundary is represented by interfaces, config validation, and tests.

## Boundaries
- `frontend` consumes HTTP contracts only and never reads database state directly.
- `backend` owns business rules, persistence boundaries, and external integrations.
- `packages/` contains configuration only during foundation work.
- Domain contracts remain inside app workspaces until duplication justifies extraction.

