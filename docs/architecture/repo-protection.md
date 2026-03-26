# Repository Protection Recommendations

## Pull Request Policy
- Require pull requests before merging into `main`.
- Require `lint`, `typecheck`, and `test` to pass before merge.
- Require at least one human review once the team grows beyond a single maintainer.
- Block force pushes and branch deletions on `main`.
- Keep Codex review as advisory until the team validates its signal quality on this repository.

## Status Checks
- `lint`
- `typecheck`
- `test`

## GitHub Actions Security Baseline
- Default every workflow to `permissions: contents: read` and elevate only when necessary.
- Use `pull_request`, not `pull_request_target`, for workflows that react to repository code changes.
- Do not expose secrets to fork pull requests.
- Set `timeout-minutes` and `concurrency` for every workflow.
- Prefer first-party actions and pin third-party actions by SHA when introduced.
- Keep Codex review limited to PR comments or reviews; it must not mutate repository contents.

## Codex Review Policy
- Trigger Codex review only for non-draft PRs targeting `main`.
- Skip fork PRs by default.
- Request review by posting `@codex review` from automation, which assumes the repository is connected to Codex on GitHub.
- If Codex is not enabled for the repository yet, the workflow should remain non-blocking and human review remains mandatory.

## Merge Strategy
- Prefer squash merges during the foundation milestone.
- Keep PRs scoped to a single issue and link them with `Closes #<issue>`.
