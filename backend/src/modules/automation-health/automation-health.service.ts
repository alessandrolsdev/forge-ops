import type { Logger } from 'pino';
import { computeAutomationHealthScore, RECENT_RUN_SAMPLE_SIZE } from '@forgeops/core';
import { RepositoryNotFoundError } from '../repository-registry/repository.errors.js';
import type { Repository } from '../repository-registry/repository.entity.js';
import type { RepositoryRepository } from '../repository-registry/repository.repository.js';
import type { WorkflowRepository } from '../workflow-catalog/workflow.repository.js';
import type { WorkflowRunRepository } from '../workflow-runs/workflow-run.repository.js';
import type { PullRequestRepository } from '../pull-request-insights/pull-request.repository.js';
import type { CodexReviewSummaryRepository } from '../pull-request-insights/codex-review-summary.repository.js';
import type { AutomationHealthScore } from './automation-health.entity.js';

type ServiceLogger = Pick<Logger, 'info' | 'error'>;

const noopLogger: ServiceLogger = {
  info: () => undefined,
  error: () => undefined,
};

export interface AutomationHealthServiceOptions {
  repositoryRegistryRepository: RepositoryRepository;
  workflowRepository: WorkflowRepository;
  workflowRunRepository: WorkflowRunRepository;
  pullRequestRepository: PullRequestRepository;
  codexReviewSummaryRepository: CodexReviewSummaryRepository;
  logger?: ServiceLogger;
}

export class AutomationHealthService {
  constructor(private readonly options: AutomationHealthServiceOptions) {}

  async getScoreByRepositoryId(
    repositoryId: string,
  ): Promise<AutomationHealthScore> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      throw new RepositoryNotFoundError();
    }

    return this.computeScore(repository);
  }

  async getOverview(): Promise<AutomationHealthScore[]> {
    const repositories =
      await this.options.repositoryRegistryRepository.list();
    const scores: AutomationHealthScore[] = [];

    for (const repository of repositories) {
      if (!repository.isActive) {
        continue;
      }

      scores.push(await this.computeScore(repository));
    }

    return scores.sort((left, right) => left.score - right.score);
  }

  private async computeScore(
    repository: Repository,
  ): Promise<AutomationHealthScore> {
    const [workflows, recentRuns, pullRequests, reviewSummaries] =
      await Promise.all([
        this.options.workflowRepository.listByRepositoryId(repository.id),
        this.options.workflowRunRepository.listRecentCompletedRunsByRepositoryId(
          repository.id,
          RECENT_RUN_SAMPLE_SIZE,
        ),
        this.options.pullRequestRepository.listByRepositoryId(repository.id),
        this.options.codexReviewSummaryRepository.listByRepositoryId(
          repository.id,
        ),
      ]);

    const openPullRequestIds = new Set(
      pullRequests
        .filter((pullRequest) => pullRequest.state === 'open')
        .map((pullRequest) => pullRequest.id),
    );

    const computation = computeAutomationHealthScore({
      workflows,
      recentRunConclusions: recentRuns.map((run) => run.conclusion),
      reviewedPullRequests: reviewSummaries.map((summary) => ({
        blockersCount: summary.blockersCount,
        isOpen: openPullRequestIds.has(summary.pullRequestId),
      })),
    });

    const healthScore: AutomationHealthScore = {
      ...computation,
      repositoryId: repository.id,
      fullName: repository.fullName,
      computedAt: new Date(),
    };

    this.logger.info(
      {
        event: 'automation_health_score_computed',
        repositoryId: repository.id,
        fullName: repository.fullName,
        score: healthScore.score,
        grade: healthScore.grade,
      },
      'Automation health score computed.',
    );

    return healthScore;
  }

  private get logger(): ServiceLogger {
    return this.options.logger ?? noopLogger;
  }
}
