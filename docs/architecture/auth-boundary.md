# Authentication and Authorization Boundary

## Goal
Define the minimum authentication and authorization boundary for ForgeOps before the first business endpoints are introduced.

## Why this exists now
- `health` is currently the only real backend endpoint and can remain public.
- The first product verticals will expose repository metadata, workflow state, pull request signals, and sync actions.
- Introducing those endpoints without a clear auth/authz boundary would create avoidable rework and security drift.

## Boundary terms
- Authentication proves who is calling ForgeOps.
- Authorization decides what an authenticated caller is allowed to read or change.
- GitHub App integration is not operator authentication.
- GitHub webhook verification is not operator authentication either; it is machine-to-machine request verification.

## Actor classes
### 1. Operator
A human using the ForgeOps frontend or API for product workflows.

### 2. GitHub App integration
ForgeOps authenticating outbound calls to GitHub as an installed GitHub App.

### 3. GitHub webhook caller
GitHub sending inbound webhook events that ForgeOps must verify with a webhook secret and signature validation.

### 4. Internal runtime
Trusted backend modules and jobs running inside ForgeOps after an external request has already been authenticated and authorized.

## Current minimal decision
- Keep `GET /api/v1/health` public.
- Treat every future business endpoint as protected by default.
- Do not treat GitHub App credentials as a substitute for operator auth.
- Do not expose business routes first and "add auth later".
- Fail closed: if a route is not explicitly public, it should be assumed protected once auth middleware exists.

## Authentication boundary
### Operator authentication
ForgeOps should introduce a single operator identity boundary in the backend.

Minimum expectation:
- protected routes require an authenticated operator principal
- the backend resolves that principal before route logic runs
- route handlers and services receive a normalized principal/context, not raw tokens
- the exact identity provider may change later, but the backend contract should not depend on frontend-specific auth details

### GitHub App authentication
GitHub App auth remains isolated inside provider/client code.

Rules:
- used only for outbound GitHub API access
- never used to authorize operator-facing actions on its own
- installation scope and token handling stay inside the integration boundary

### Webhook verification
Webhook verification must be treated as a separate machine-auth boundary.

Rules:
- inbound GitHub webhooks are publicly reachable endpoints by network position
- they are protected by signature verification, timestamp checks if applicable, and replay-aware handling
- webhook handlers should not require operator sessions or bearer tokens

## Authorization boundary
Start with coarse-grained authorization, not full RBAC.

Minimum decision for the next stage:
- public routes: explicit allowlist only
- protected read routes: require an authenticated operator
- protected write or sync-triggering routes: require an authenticated operator and an explicit capability check
- webhook routes: require valid GitHub signature verification, not operator auth

The first implementation does not need multi-role RBAC. A single authenticated operator role is enough for the first protected business routes, as long as the authorization boundary is explicit and centralized.

## Endpoint classification
| Endpoint category | Current/future state | Protection |
|---|---|---|
| `GET /api/v1/health` | current | public |
| Product read endpoints like repositories, workflows, PR insights | future immediate | authenticated operator required |
| Product write endpoints like connect repo, trigger sync, policy actions | future immediate | authenticated operator plus explicit authorization check |
| GitHub webhook endpoints | future immediate | public network path with webhook signature verification |
| Internal jobs/queues | future | no external auth boundary; trust internal runtime only |

## Request pipeline expectation
Protected operator-facing routes should follow this order:
1. request parsing and validation
2. operator authentication
3. authorization/capability check
4. route handler/controller
5. service logic
6. repository/provider calls

Webhook routes should follow this order:
1. signature verification
2. payload validation
3. idempotency/replay protection
4. handler/service logic

## Minimum configuration requirements
The first auth rollout should define configuration for:
- whether operator auth is enabled for protected routes
- issuer/audience information for the chosen operator auth verifier
- one verifier source such as a JWKS URL or shared verification secret, depending on the implementation
- GitHub webhook secret for inbound webhook verification
- clear separation between operator auth config and GitHub App credentials

Rules:
- no auth secret belongs in the frontend
- protected routes must fail safely when required auth config is missing
- local development may use simplified auth configuration, but only behind an explicit development mode decision

## Backend integration rules
- controllers must not parse raw auth tokens directly
- auth middleware resolves a normalized principal and attaches it to request context
- services depend on the principal or authorization result, not on HTTP headers
- GitHub providers must not infer operator identity from GitHub App installation data
- logs must avoid leaking auth credentials, webhook secrets, or provider tokens

## Rollout plan
### Stage 0
- keep `health` public
- no business endpoints exposed yet

### Stage 1
- add auth config loader and normalized principal model
- add operator auth middleware scaffold
- add route metadata or guard mechanism for public vs protected routes

### Stage 2
- protect the first business endpoints for `Repository Registry`
- add coarse-grained authorization checks for state-changing actions

### Stage 3
- add GitHub webhook signature verification before sync/event ingestion endpoints ship
- evaluate whether finer-grained roles are needed after the first vertical is stable

## Explicit non-goals for this stage
- no user model yet
- no session storage design yet
- no OAuth flow design yet
- no RBAC matrix yet
- no frontend auth implementation in this issue

## Follow-up issues
1. Add auth configuration loader and normalized operator principal boundary in `backend`.
2. Implement backend auth middleware scaffold and route protection classification.
3. Add GitHub webhook signature verification boundary before webhook endpoints are introduced.
4. Protect the first `Repository Registry` endpoints with authenticated operator checks and authorization tests.

## Decision summary
- `health` stays public.
- future business endpoints are protected by default.
- operator auth, GitHub App auth, and webhook verification are three different boundaries.
- coarse-grained operator authorization is enough for the first protected vertical.
- ForgeOps should introduce auth before shipping product endpoints beyond `health`.
