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
type WorkflowCatalogSync = {
  syncByRepositoryId(repositoryId: string): Promise<unknown[]>;
};
type WorkflowRunSync = {
  syncByRepositoryId(repositoryId: string): Promise<unknown[]>;
};
type PullRequestSync = {
  syncByRepositoryId(repositoryId: string): Promise<unknown[]>;
};

const noopLogger: ServiceLogger = {
  info: () => undefined,
  error: () => undefined,
};

export interface RepositoryServiceOptions {
  repository: RepositoryRepository;
  githubBoundary: GitHubAppBoundary;
  workflowCatalogSync?: WorkflowCatalogSync;
  workflowRunSync?: WorkflowRunSync;
  pullRequestSync?: PullRequestSync;
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
      let syncedWorkflows: unknown[] | undefined;
      let syncedWorkflowRuns: unknown[] | undefined;
      let syncedPullRequests: unknown[] | undefined;

      try {
        syncedWorkflows = await this.options.workflowCatalogSync?.syncByRepositoryId(
          repository.id,
        );
        syncedWorkflowRuns = await this.options.workflowRunSync?.syncByRepositoryId(
          repository.id,
        );
        syncedPullRequests = await this.options.pullRequestSync?.syncByRepositoryId(
          repository.id,
        );
      } catch (error) {
        throw {
          repositoryId: repository.id,
          cause: error,
        };
      }

      this.logger.info(
        {
          event: 'repository_ingestion_succeeded',
          repositoryId: repository.id,
          githubRepoId: repository.githubRepoId,
          fullName: repository.fullName,
          syncedWorkflowCount: syncedWorkflows?.length ?? 0,
          syncedWorkflowRunCount: syncedWorkflowRuns?.length ?? 0,
          syncedPullRequestCount: syncedPullRequests?.length ?? 0,
        },
        'Repository ingestion completed.',
      );

      return repository;
    } catch (error) {
      if (hasRepositoryContext(error)) {
        await this.rollbackRepository(error.repositoryId);
      }

      this.logger.error(
        {
          event: 'repository_ingestion_failed',
          repositoryId: getRepositoryId(error),
          githubRepoId: input.githubRepoId,
          fullName: input.fullName,
          ...serializeApplicationError(unwrapRepositoryContext(error)),
        },
        'Repository ingestion failed.',
      );

      throw unwrapRepositoryContext(error);
    }
  }

  listInstallationRepositories(): Promise<GitHubInstallationRepository[]> {
    return this.options.githubBoundary.listInstallationRepositories();
  }

  private get logger(): ServiceLogger {
    return this.options.logger ?? noopLogger;
  }

  private async rollbackRepository(repositoryId: string): Promise<void> {
    try {
      await this.options.repository.deleteById(repositoryId);
    } catch (error) {
      this.logger.error(
        {
          event: 'repository_ingestion_rollback_failed',
          repositoryId,
          ...serializeApplicationError(error),
        },
        'Repository rollback after failed ingestion failed.',
      );
    }
  }
}

const serializeApplicationError = (error: unknown): Record<string, string | number> => {
  if (error instanceof ApplicationError) {
    return {
      errorCode: error.code,
      errorStatusCode: error.statusCode,
      ...(error.details ?? {}),
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

const hasRepositoryContext = (
  error: unknown,
): error is { repositoryId: string; cause: unknown } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'repositoryId' in error &&
    typeof error.repositoryId === 'string'
  );
};

const getRepositoryId = (error: unknown): string | undefined => {
  return hasRepositoryContext(error) ? error.repositoryId : undefined;
};

const unwrapRepositoryContext = (error: unknown): unknown => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'cause' in error
  ) {
    return error.cause;
  }

  return error;
};
