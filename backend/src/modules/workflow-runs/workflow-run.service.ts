import type { Logger } from 'pino';
import { ApplicationError } from '../../shared/errors/application-error.js';
import type { GitHubAppBoundary } from '../github/github-app.boundary.js';
import { RepositoryNotFoundError } from '../repository-registry/repository.errors.js';
import type { RepositoryRepository } from '../repository-registry/repository.repository.js';
import type { WorkflowRepository } from '../workflow-catalog/workflow.repository.js';
import type { WorkflowRun } from './workflow-run.entity.js';
import type { WorkflowRunRepository } from './workflow-run.repository.js';

type ServiceLogger = Pick<Logger, 'info' | 'error'>;

const noopLogger: ServiceLogger = {
  info: () => undefined,
  error: () => undefined,
};

export interface WorkflowRunServiceOptions {
  repositoryRegistryRepository: RepositoryRepository;
  workflowRepository: WorkflowRepository;
  workflowRunRepository: WorkflowRunRepository;
  githubBoundary: GitHubAppBoundary;
  logger?: ServiceLogger;
}

export class WorkflowRunService {
  constructor(private readonly options: WorkflowRunServiceOptions) {}

  async syncByRepositoryId(repositoryId: string): Promise<WorkflowRun[]> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      const error = new RepositoryNotFoundError();

      this.logger.error(
        {
          event: 'workflow_runs_sync_failed',
          repositoryId,
          errorCode: error.code,
          errorStatusCode: error.statusCode,
        },
        'Workflow runs sync failed.',
      );

      throw error;
    }

    try {
      const workflows = await this.options.workflowRepository.listByRepositoryId(
        repositoryId,
      );
      const syncedRuns: WorkflowRun[] = [];
      let syncedJobCount = 0;

      for (const workflow of workflows) {
        const remoteRuns = await this.options.githubBoundary.listWorkflowRuns(
          {
            owner: repository.owner,
            name: repository.name,
          },
          workflow.githubWorkflowId,
        );

        for (const remoteRun of remoteRuns) {
          const persistedRun = await this.options.workflowRunRepository.upsertRun({
            workflowId: workflow.id,
            githubRunId: remoteRun.githubRunId,
            status: remoteRun.status,
            conclusion: remoteRun.conclusion,
            branch: remoteRun.branch,
            sha: remoteRun.sha,
            event: remoteRun.event,
            startedAt: remoteRun.startedAt,
            finishedAt: remoteRun.finishedAt,
            durationMs: remoteRun.durationMs,
          });

          syncedRuns.push(persistedRun);

          const remoteJobs = await this.options.githubBoundary.listWorkflowRunJobs(
            {
              owner: repository.owner,
              name: repository.name,
            },
            remoteRun.githubRunId,
          );

          for (const remoteJob of remoteJobs) {
            await this.options.workflowRunRepository.upsertJob({
              workflowRunId: persistedRun.id,
              githubJobId: remoteJob.githubJobId,
              name: remoteJob.name,
              status: remoteJob.status,
              conclusion: remoteJob.conclusion,
              startedAt: remoteJob.startedAt,
              finishedAt: remoteJob.finishedAt,
            });

            syncedJobCount += 1;
          }
        }
      }

      this.logger.info(
        {
          event: 'workflow_runs_sync_succeeded',
          repositoryId: repository.id,
          fullName: repository.fullName,
          catalogedWorkflowCount: workflows.length,
          syncedRunCount: syncedRuns.length,
          syncedJobCount,
        },
        'Workflow runs sync completed.',
      );

      return syncedRuns;
    } catch (error) {
      this.logger.error(
        {
          event: 'workflow_runs_sync_failed',
          repositoryId: repository.id,
          fullName: repository.fullName,
          ...serializeApplicationError(error),
        },
        'Workflow runs sync failed.',
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
