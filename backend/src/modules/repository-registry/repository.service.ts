import type {
  CreateRepositoryInput,
  Repository,
} from './repository.entity.js';
import type {
  GitHubAppBoundary,
  GitHubInstallationRepository,
} from '../github/github-app.boundary.js';
import type { RepositoryRepository } from './repository.repository.js';

export interface RepositoryServiceOptions {
  repository: RepositoryRepository;
  githubBoundary: GitHubAppBoundary;
}

export class RepositoryService {
  constructor(private readonly options: RepositoryServiceOptions) {}

  list(): Promise<Repository[]> {
    return this.options.repository.list();
  }

  create(input: CreateRepositoryInput): Promise<Repository> {
    return this.options.repository.create(input);
  }

  listInstallationRepositories(): Promise<GitHubInstallationRepository[]> {
    return this.options.githubBoundary.listInstallationRepositories();
  }
}
