# ADR-0003: Keep shared packages minimal during foundation

**Status:** Accepted

## Context
The product blueprint mentions `packages/ui`, `packages/types`, and `packages/config`, but the repository does not yet have multiple consumers for runtime code.

## Decision
Create only `packages/tsconfig` and `packages/eslint-config` during the foundation milestone. Shared runtime code is deferred until a second consumer exists.

## Consequences
- Positive: avoids premature abstractions and circular dependencies.
- Positive: keeps boundaries between `frontend` and `backend` explicit.
- Negative: some duplication may remain temporarily inside app workspaces.

## Alternatives Discarded
- Create all planned shared packages immediately: rejected because it encourages speculative abstractions.

