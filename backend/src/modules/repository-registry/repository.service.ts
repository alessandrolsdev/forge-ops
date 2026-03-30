import type { Logger } from 'pino';
import type {
  CreateRepositoryInput,
  Repository,
} from './repository.entity.js';
import type {
  GitHubAppBoundary,
  GitHubInstallationRepository,
} from '../github/github-app.boundary.js';
import type { RepositoryRepository } from './repository.repository.js';
import { ApplicationError } from '../../shared/errors/application-error.js';

type ServiceLogger = Pick<Logger, 'info' | 'error'>;

const noopLogger: ServiceLogger = {
  info: () => undefined,
  error: () => undefined,
};

export interface RepositoryServiceOptions {
  repository: RepositoryRepository;
  githubBoundary: GitHubAppBoundary;
  logger?: ServiceLogger;
}

export class RepositoryService {
  constructor(private readonly options: RepositoryServiceOptions) {}

  list(): Promise<Repository[]> {
    return this.options.repository.list();
  }

  async create(input: CreateRepositoryInput): Promise<Repository> {
    try {
      const repository = await this.options.repository.create(input);

      this.logger.info(
        {
          event: 'repository_ingestion_succeeded',
          repositoryId: repository.id,
          githubRepoId: repository.githubRepoId,
          fullName: repository.fullName,
        },
        'Repository ingestion completed.',
      );

      return repository;
    } catch (error) {
      this.logger.error(
        {
          event: 'repository_ingestion_failed',
          githubRepoId: input.githubRepoId,
          fullName: input.fullName,
          ...serializeApplicationError(error),
        },
        'Repository ingestion failed.',
      );

      throw error;
    }
  }

  listInstallationRepositories(): Promise<GitHubInstallationRepository[]> {
    return this.options.githubBoundary.listInstallationRepositories();
  }

  private get logger(): ServiceLogger {
    return this.options.logger ?? noopLogger;
  }
}

const serializeApplicationError = (error: unknown): Record<string, string | number> => {
  if (error instanceof ApplicationError) {
    return {
      errorCode: error.code,
      errorStatusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      errorName: error.name,
    };
  }

  return {
    errorName: 'UnknownError',
  };
};
