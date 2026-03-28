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
