import type { Logger } from 'pino';
import { ApplicationError } from '../../shared/errors/application-error.js';
import type { GitHubAppBoundary } from '../github/github-app.boundary.js';
import { RepositoryNotFoundError } from '../repository-registry/repository.errors.js';
import type { RepositoryRepository } from '../repository-registry/repository.repository.js';
import type { PullRequest } from './pull-request.entity.js';
import type { PullRequestRepository } from './pull-request.repository.js';

type ServiceLogger = Pick<Logger, 'info' | 'error'>;

const noopLogger: ServiceLogger = {
  info: () => undefined,
  error: () => undefined,
};

export interface PullRequestServiceOptions {
  repositoryRegistryRepository: RepositoryRepository;
  pullRequestRepository: PullRequestRepository;
  githubBoundary: GitHubAppBoundary;
  logger?: ServiceLogger;
}

export class PullRequestService {
  constructor(private readonly options: PullRequestServiceOptions) {}

  async listByRepositoryId(repositoryId: string): Promise<PullRequest[]> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      throw new RepositoryNotFoundError();
    }

    return this.options.pullRequestRepository.listByRepositoryId(repositoryId);
  }

  async syncByRepositoryId(repositoryId: string): Promise<PullRequest[]> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      const error = new RepositoryNotFoundError();

      this.logger.error(
        {
          event: 'pull_request_sync_failed',
          repositoryId,
          errorCode: error.code,
          errorStatusCode: error.statusCode,
        },
        'Pull request sync failed.',
      );

      throw error;
    }

    try {
      const remotePullRequests = await this.options.githubBoundary.listPullRequests({
        owner: repository.owner,
        name: repository.name,
      });

      const persistedPullRequests = await Promise.all(
        remotePullRequests.map((pullRequest) =>
          this.options.pullRequestRepository.upsert({
            repositoryId: repository.id,
            githubPrId: pullRequest.githubPrId,
            number: pullRequest.number,
            title: pullRequest.title,
            state: pullRequest.state,
            author: pullRequest.author,
            baseBranch: pullRequest.baseBranch,
            headBranch: pullRequest.headBranch,
          }),
        ),
      );

      this.logger.info(
        {
          event: 'pull_request_sync_succeeded',
          repositoryId: repository.id,
          fullName: repository.fullName,
          remotePullRequestCount: remotePullRequests.length,
          persistedPullRequestCount: persistedPullRequests.length,
        },
        'Pull request sync completed.',
      );

      return persistedPullRequests;
    } catch (error) {
      this.logger.error(
        {
          event: 'pull_request_sync_failed',
          repositoryId: repository.id,
          fullName: repository.fullName,
          ...serializeApplicationError(error),
        },
        'Pull request sync failed.',
      );

      throw error;
    }
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
