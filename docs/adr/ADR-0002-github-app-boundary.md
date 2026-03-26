# ADR-0002: Use a GitHub App boundary for ForgeOps integrations

**Status:** Accepted

## Context
ForgeOps monitors repositories, workflows, pull requests, and automated reviews across multiple repositories. Using personal access tokens would blur ownership and make rotation and audit harder.

## Decision
Represent GitHub integration through a GitHub App boundary. The foundation milestone defines configuration, interfaces, and provider boundaries without implementing full synchronization flows.

## Consequences
- Positive: stronger security posture and cleaner multi-repository evolution.
- Positive: provider interfaces can be mocked before network integration exists.
- Negative: slightly more setup complexity than a PAT-based prototype.

## Alternatives Discarded
- Use PATs for bootstrap: rejected because it creates security debt and weakens long-term tenancy and auditability.

