import { ApplicationError } from '../../shared/errors/application-error.js';

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
  constructor() {
    super(
      'GitHub workflow catalog is currently unavailable.',
      503,
      'github_workflow_catalog_unavailable',
    );
  }
}
