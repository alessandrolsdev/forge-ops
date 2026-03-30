import type { Logger } from 'pino';
import { ApplicationError } from '../../shared/errors/application-error.js';
import type { GitHubAppBoundary } from '../github/github-app.boundary.js';
import { RepositoryNotFoundError } from '../repository-registry/repository.errors.js';
import type { RepositoryRepository } from '../repository-registry/repository.repository.js';
import type { Workflow } from './workflow.entity.js';
import type { WorkflowRepository } from './workflow.repository.js';

type ServiceLogger = Pick<Logger, 'info' | 'error'>;

const noopLogger: ServiceLogger = {
  info: () => undefined,
  error: () => undefined,
};

export interface WorkflowServiceOptions {
  repositoryRegistryRepository: RepositoryRepository;
  workflowRepository: WorkflowRepository;
  githubBoundary: GitHubAppBoundary;
  logger?: ServiceLogger;
}

export class WorkflowService {
  constructor(private readonly options: WorkflowServiceOptions) {}

  async listByRepositoryId(repositoryId: string): Promise<Workflow[]> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      throw new RepositoryNotFoundError();
    }

    return this.options.workflowRepository.listByRepositoryId(repositoryId);
  }

  async syncByRepositoryId(repositoryId: string): Promise<Workflow[]> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      const error = new RepositoryNotFoundError();

      this.logger.error(
        {
          event: 'workflow_catalog_sync_failed',
          repositoryId,
          errorCode: error.code,
          errorStatusCode: error.statusCode,
        },
        'Workflow catalog sync failed.',
      );

      throw error;
    }

    try {
      const remoteWorkflows = await this.options.githubBoundary.listRepositoryWorkflows({
        owner: repository.owner,
        name: repository.name,
      });

      await Promise.all(
        remoteWorkflows.map((workflow) =>
          this.options.workflowRepository.upsert({
            repositoryId: repository.id,
            githubWorkflowId: workflow.githubWorkflowId,
            name: workflow.name,
            path: workflow.path,
            state: workflow.state,
            sourceType: workflow.sourceType,
          }),
        ),
      );

      const persistedWorkflows = await this.options.workflowRepository.listByRepositoryId(
        repositoryId,
      );

      this.logger.info(
        {
          event: 'workflow_catalog_sync_succeeded',
          repositoryId: repository.id,
          fullName: repository.fullName,
          remoteWorkflowCount: remoteWorkflows.length,
          persistedWorkflowCount: persistedWorkflows.length,
        },
        'Workflow catalog sync completed.',
      );

      return persistedWorkflows;
    } catch (error) {
      this.logger.error(
        {
          event: 'workflow_catalog_sync_failed',
          repositoryId: repository.id,
          fullName: repository.fullName,
          ...serializeApplicationError(error),
        },
        'Workflow catalog sync failed.',
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
