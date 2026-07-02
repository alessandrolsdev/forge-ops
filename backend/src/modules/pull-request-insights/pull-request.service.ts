import type { Logger } from 'pino';
import { ApplicationError } from '../../shared/errors/application-error.js';
import type { GitHubAppBoundary } from '../github/github-app.boundary.js';
import { RepositoryNotFoundError } from '../repository-registry/repository.errors.js';
import type { RepositoryRepository } from '../repository-registry/repository.repository.js';
import type { CodexReviewSummaryRepository } from './codex-review-summary.repository.js';
import type { PullRequest } from './pull-request.entity.js';
import { PullRequestNotFoundError } from './pull-request.errors.js';
import type { PullRequestRepository } from './pull-request.repository.js';
import type { CodexReviewSummaryService } from './codex-review-summary.service.js';
import type { WorkflowRepository } from '../workflow-catalog/workflow.repository.js';
import type { WorkflowRunRepository } from '../workflow-runs/workflow-run.repository.js';
import type {
  WorkflowExecutionConclusion,
  WorkflowExecutionStatus,
} from '../workflow-runs/workflow-run.entity.js';

type ServiceLogger = Pick<Logger, 'info' | 'error'>;

const noopLogger: ServiceLogger = {
  info: () => undefined,
  error: () => undefined,
};

export interface PullRequestServiceOptions {
  repositoryRegistryRepository: RepositoryRepository;
  pullRequestRepository: PullRequestRepository;
  githubBoundary: GitHubAppBoundary;
  workflowRepository?: WorkflowRepository;
  workflowRunRepository?: WorkflowRunRepository;
  codexReviewSummaryRepository?: CodexReviewSummaryRepository;
  codexReviewSummaryService?: Pick<
    CodexReviewSummaryService,
    'syncByPullRequest'
  >;
  logger?: ServiceLogger;
}

export interface PullRequestDetail {
  id: string;
  number: number;
  title: string;
  status: PullRequest['state'];
  author: string;
  summary: {
    blockersCount: number;
    risksCount: number;
    suggestionsCount: number;
    lastReviewedAt: Date;
  } | null;
  workflows: Array<{
    name: string;
    status: WorkflowExecutionStatus;
    conclusion: WorkflowExecutionConclusion | null;
    startedAt: Date | null;
    finishedAt: Date | null;
  }>;
}

export interface PullRequestCodexReviewRequest {
  pullRequestId: string;
  pullRequestNumber: number;
  label: 'codex-review';
  status: 'requested';
}

export interface RepositoryReviewInsights {
  repositoryId: string;
  openPullRequestCount: number;
  reviewedPullRequestCount: number;
  openBlockersCount: number;
  totalBlockersCount: number;
  totalRisksCount: number;
  totalSuggestionsCount: number;
  lastReviewedAt: Date | null;
}

const MANUAL_CODEX_REVIEW_LABEL = 'codex-review' as const;

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

  async getDetailById(
    repositoryId: string,
    pullRequestId: string,
  ): Promise<PullRequestDetail> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      throw new RepositoryNotFoundError();
    }

    const pullRequest = await this.options.pullRequestRepository.findById(
      pullRequestId,
    );

    if (!pullRequest || pullRequest.repositoryId !== repositoryId) {
      throw new PullRequestNotFoundError();
    }

    if (
      !this.options.workflowRepository ||
      !this.options.workflowRunRepository ||
      !this.options.codexReviewSummaryRepository
    ) {
      throw new Error('Pull request detail dependencies are not configured.');
    }

    const [summary, workflows] = await Promise.all([
      this.options.codexReviewSummaryRepository.findByPullRequestId(
        pullRequest.id,
      ),
      this.options.workflowRepository.listByRepositoryId(repositoryId),
    ]);

    const workflowRuns = await Promise.all(
      workflows.map(async (workflow) => {
        const runs = await this.options.workflowRunRepository!.listRunsByWorkflowId(
          workflow.id,
        );

        return runs
          .filter(
            (run) =>
              run.branch === pullRequest.headBranch &&
              run.createdAt.getTime() >= pullRequest.createdAt.getTime(),
          )
          .map((run) => ({
            name: workflow.name,
            status: run.status,
            conclusion: run.conclusion,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt,
            sortTime:
              run.startedAt?.getTime() ??
              run.createdAt.getTime(),
          }));
      }),
    );

    return {
      id: pullRequest.id,
      number: pullRequest.number,
      title: pullRequest.title,
      status: pullRequest.state,
      author: pullRequest.author,
      summary: summary
        ? {
            blockersCount: summary.blockersCount,
            risksCount: summary.risksCount,
            suggestionsCount: summary.suggestionsCount,
            lastReviewedAt: summary.updatedAt,
          }
        : null,
      workflows: workflowRuns
        .flat()
        .sort((left, right) => right.sortTime - left.sortTime)
        .map((workflow) => ({
          name: workflow.name,
          status: workflow.status,
          conclusion: workflow.conclusion,
          startedAt: workflow.startedAt,
          finishedAt: workflow.finishedAt,
        })),
    };
  }

  async getReviewInsightsByRepositoryId(
    repositoryId: string,
  ): Promise<RepositoryReviewInsights> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      throw new RepositoryNotFoundError();
    }

    if (!this.options.codexReviewSummaryRepository) {
      throw new Error('Review insights dependencies are not configured.');
    }

    const [pullRequests, reviewSummaries] = await Promise.all([
      this.options.pullRequestRepository.listByRepositoryId(repositoryId),
      this.options.codexReviewSummaryRepository.listByRepositoryId(
        repositoryId,
      ),
    ]);

    const openPullRequestIds = new Set(
      pullRequests
        .filter((pullRequest) => pullRequest.state === 'open')
        .map((pullRequest) => pullRequest.id),
    );

    let openBlockersCount = 0;
    let totalBlockersCount = 0;
    let totalRisksCount = 0;
    let totalSuggestionsCount = 0;
    let lastReviewedAt: Date | null = null;

    for (const summary of reviewSummaries) {
      totalBlockersCount += summary.blockersCount;
      totalRisksCount += summary.risksCount;
      totalSuggestionsCount += summary.suggestionsCount;

      if (openPullRequestIds.has(summary.pullRequestId)) {
        openBlockersCount += summary.blockersCount;
      }

      if (!lastReviewedAt || summary.updatedAt > lastReviewedAt) {
        lastReviewedAt = summary.updatedAt;
      }
    }

    return {
      repositoryId: repository.id,
      openPullRequestCount: openPullRequestIds.size,
      reviewedPullRequestCount: reviewSummaries.length,
      openBlockersCount,
      totalBlockersCount,
      totalRisksCount,
      totalSuggestionsCount,
      lastReviewedAt,
    };
  }

  async requestCodexReviewById(
    repositoryId: string,
    pullRequestId: string,
  ): Promise<PullRequestCodexReviewRequest> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      throw new RepositoryNotFoundError();
    }

    const pullRequest = await this.options.pullRequestRepository.findById(
      pullRequestId,
    );

    if (!pullRequest || pullRequest.repositoryId !== repositoryId) {
      throw new PullRequestNotFoundError();
    }

    const requestPullRequestCodexReview =
      this.options.githubBoundary.requestPullRequestCodexReview;

    if (!requestPullRequestCodexReview) {
      throw new Error('GitHub manual review requests are not configured.');
    }

    try {
      await requestPullRequestCodexReview(
        {
          owner: repository.owner,
          name: repository.name,
        },
        pullRequest.number,
      );

      this.logger.info(
        {
          event: 'pull_request_codex_review_requested',
          repositoryId: repository.id,
          fullName: repository.fullName,
          pullRequestId: pullRequest.id,
          githubPrNumber: pullRequest.number,
          reviewLabel: MANUAL_CODEX_REVIEW_LABEL,
        },
        'Manual Codex review request submitted.',
      );

      return {
        pullRequestId: pullRequest.id,
        pullRequestNumber: pullRequest.number,
        label: MANUAL_CODEX_REVIEW_LABEL,
        status: 'requested',
      };
    } catch (error) {
      this.logger.error(
        {
          event: 'pull_request_codex_review_request_failed',
          repositoryId: repository.id,
          fullName: repository.fullName,
          pullRequestId: pullRequest.id,
          githubPrNumber: pullRequest.number,
          reviewLabel: MANUAL_CODEX_REVIEW_LABEL,
          ...serializeApplicationError(error),
        },
        'Manual Codex review request failed.',
      );

      throw error;
    }
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

      if (this.options.codexReviewSummaryService) {
        const summarySyncResults = await Promise.allSettled(
          persistedPullRequests.map((pullRequest) =>
            this.options.codexReviewSummaryService!.syncByPullRequest(pullRequest),
          ),
        );

        summarySyncResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            return;
          }

          const pullRequest = persistedPullRequests[index];

          this.logger.error(
            {
              event: 'codex_review_summary_sync_failed_non_blocking',
              repositoryId: repository.id,
              pullRequestId: pullRequest?.id,
              githubPrId: pullRequest?.githubPrId,
              githubPrNumber: pullRequest?.number,
              ...serializeApplicationError(result.reason),
            },
            'Codex review summary sync failed, but pull request sync will continue.',
          );
        });
      }

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
