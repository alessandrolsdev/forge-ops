import {
  ApplicationError,
  type ApplicationErrorDetails,
} from '../../shared/errors/application-error.js';

export class GitHubRepositoryDiscoveryError extends ApplicationError {
  constructor() {
    super(
      'GitHub repository discovery is currently unavailable.',
      503,
      'github_repository_discovery_unavailable',
    );
  }
}

export class GitHubWorkflowCatalogSyncError extends ApplicationError {
  constructor(details: ApplicationErrorDetails | null = null) {
    super(
      'GitHub workflow catalog is currently unavailable.',
      503,
      'github_workflow_catalog_unavailable',
      details,
    );
  }
}

export class GitHubWorkflowRunsSyncError extends ApplicationError {
  constructor() {
    super(
      'GitHub workflow runs are currently unavailable.',
      503,
      'github_workflow_runs_unavailable',
    );
  }
}

export class GitHubPullRequestSyncError extends ApplicationError {
  constructor() {
    super(
      'GitHub pull requests are currently unavailable.',
      503,
      'github_pull_request_sync_unavailable',
    );
  }
}

export class GitHubPullRequestReviewSyncError extends ApplicationError {
  constructor() {
    super(
      'GitHub pull request reviews are currently unavailable.',
      503,
      'github_pull_request_review_sync_unavailable',
    );
  }
}

export class GitHubPullRequestReviewRequestError extends ApplicationError {
  constructor(details: ApplicationErrorDetails | null = null) {
    super(
      'GitHub manual Codex review request is currently unavailable.',
      503,
      'github_pull_request_review_request_unavailable',
      details,
    );
  }
}

export class GitHubWebhookVerificationError extends ApplicationError {
  constructor() {
    super(
      'GitHub webhook verification failed.',
      401,
      'github_webhook_verification_failed',
    );
  }
}
