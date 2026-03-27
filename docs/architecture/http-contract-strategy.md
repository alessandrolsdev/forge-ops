# HTTP Contract Strategy

## Goal
Keep HTTP contracts between `backend` and `frontend` stable during the hardening stage without introducing a shared runtime package too early.

## Source of truth
- The `backend` owns the HTTP contract.
- Route handlers and service output types define the canonical response shape.
- The `frontend` consumes backend endpoints through an explicit client boundary and validates payloads locally with `zod`.

## Current strategy
- Keep runtime contract definitions inside each app workspace during the hardening stage.
- The `frontend` may mirror backend response schemas locally when it needs client-side validation.
- Every mirrored contract with product impact must be protected by an automated contract test or equivalent coverage.

## Contract validation rule
- The preferred validation path is an automated test that exercises a real backend response through the consuming frontend client.
- Unit tests that validate each side independently are useful, but they do not replace a contract test when drift risk is relevant.

## Extraction trigger for `packages/`
Create a shared runtime contract package only when all conditions below are true:
- at least two runtime workspaces need the same contract artifact
- the same contract is duplicated in at least two meaningful places
- extraction reduces duplication without coupling unstable backend internals into the frontend
- the decision is documented before introduction

## Current decision for ForgeOps
- Do not create `packages/contracts` yet.
- Keep the health contract local to each app.
- Use a contract test to ensure the frontend parser still accepts the real backend health payload.

## Follow-up guidance
- Reevaluate extraction when the first real product vertical introduces repeated request/response schemas beyond health.
- Treat drift between backend output and frontend parser as a blocking regression.
