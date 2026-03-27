# ADR-0001: Use `main` as the bootstrap trunk branch

**Status:** Accepted

## Context
The repository starts without commit history or an established release workflow. Adding `develop` during foundation work would increase coordination cost before the project has parallel streams.

## Decision
Use `main` as the trunk branch during the foundation milestone. Short-lived feature branches merge into `main` through pull requests protected by CI.

## Consequences
- Positive: simpler bootstrap flow and fewer branch-management decisions.
- Positive: CI, templates, and protection rules can target a single default branch.
- Negative: later release workflows may require an ADR to add staging branches.

## Alternatives Discarded
- Create `develop` immediately: rejected because it adds operational overhead without improving foundation delivery.

