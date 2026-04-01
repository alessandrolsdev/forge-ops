# Repository Protection Recommendations

## Pull Request Policy
- Require pull requests before merging into `main`.
- Require `actionlint`, `lint`, `typecheck`, and `test` to pass before merge.
- Require at least one human review once the team grows beyond a single maintainer.
- Block force pushes and branch deletions on `main`.
- Keep Codex review as advisory until the team validates its signal quality on this repository.

## Status Checks
- `actionlint`
- `lint`
- `typecheck`
- `test`

## GitHub Actions Security Baseline
- Default every workflow to `permissions: contents: read` and elevate only when necessary.
- Use `pull_request`, not `pull_request_target`, for workflows that react to repository code changes.
- Do not expose secrets to fork pull requests.
- Set `timeout-minutes` and `concurrency` for every workflow.
- Pin workflow actions by commit SHA instead of floating tags.
- Prefer first-party actions when possible and validate workflow files with `actionlint`.
- Keep Codex review limited to PR comments or reviews; it must not mutate repository contents.

## Codex Review Policy
- Trigger Codex review only for non-draft PRs targeting `main`.
- Skip fork PRs by default.
- Treat Codex review as advisory until the repository owner validates the signal quality and GitHub connector readiness.
- Gate automatic `@codex review` requests behind repository variable `CODEX_REVIEW_ENABLED=true`.
- Enable `CODEX_REVIEW_ENABLED` only after confirming that the maintainer account used for PR review is connected to GitHub in Codex and a manual `@codex review` produces an actual review.
- Publish the `@codex review` trigger comment with a dedicated maintainer PAT (`CODEX_REVIEW_PAT`) instead of `github-actions[bot]`.
- Keep `CODEX_REVIEW_PAT` scoped with the minimum repository permissions needed to read pull requests and write issue comments.
- If Codex is not enabled or not connected yet, the workflow must post a fallback comment that makes the lack of automatic review explicit and reminds reviewers that human review remains mandatory.
- If Codex review runs but still cannot publish a usable output, the fallback comment must state the observed reason instead of using a generic message.
- Keep OpenRouter as the secondary provider behind `OPENROUTER_API_KEY` plus `CODEX_REVIEW_OPENROUTER_MODEL`, so provider fallback can be adjusted without editing the workflow.
- Keep the workflow text structure versioned under `.github/prompts/` so prompt, readiness, fallback, and marker changes are reviewable outside the YAML orchestration.
- The automated Codex review prompt should require the response in Portuguese (Brazil).
- The Codex review request should focus on:
  - security-sensitive changes and secret handling
  - scope alignment with the linked issue and acceptance criteria
  - tests added or updated, plus missing coverage
  - behavioural regressions and edge cases
  - architectural boundaries and layering
  - TypeScript typing safety and unsafe relaxations
  - residual risks and follow-up items

## Merge Strategy
- Prefer squash merges during the foundation milestone.
- Keep PRs scoped to a single issue and link them with `Closes #<issue>`.
