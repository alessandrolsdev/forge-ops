import type { Logger } from 'pino';
import { RepositoryNotFoundError } from '../repository-registry/repository.errors.js';
import type { Repository } from '../repository-registry/repository.entity.js';
import type { RepositoryRepository } from '../repository-registry/repository.repository.js';
import type { WorkflowRepository } from '../workflow-catalog/workflow.repository.js';
import type { WorkflowRunRepository } from '../workflow-runs/workflow-run.repository.js';
import type { WorkflowRun } from '../workflow-runs/workflow-run.entity.js';
import type { PullRequestRepository } from '../pull-request-insights/pull-request.repository.js';
import type { CodexReviewSummaryRepository } from '../pull-request-insights/codex-review-summary.repository.js';
import { evaluatePolicySignals } from '../policy-engine/policy-signals.js';
import {
  ATTENTION_GRADE_THRESHOLD,
  BLOCKER_PENALTY_POINTS,
  CI_RELIABILITY_WEIGHT,
  HEALTHY_GRADE_THRESHOLD,
  MAX_BLOCKERS_PENALTY,
  POLICY_SIGNAL_WEIGHTS,
  RECENT_RUN_SAMPLE_SIZE,
  type AutomationHealthBlockersPenalty,
  type AutomationHealthCiReliability,
  type AutomationHealthGrade,
  type AutomationHealthScore,
  type AutomationHealthSignal,
} from './automation-health.entity.js';

type ServiceLogger = Pick<Logger, 'info' | 'error'>;

const noopLogger: ServiceLogger = {
  info: () => undefined,
  error: () => undefined,
};

const NON_INFORMATIVE_CONCLUSIONS = new Set(['skipped', 'neutral']);

export interface AutomationHealthServiceOptions {
  repositoryRegistryRepository: RepositoryRepository;
  workflowRepository: WorkflowRepository;
  workflowRunRepository: WorkflowRunRepository;
  pullRequestRepository: PullRequestRepository;
  codexReviewSummaryRepository: CodexReviewSummaryRepository;
  logger?: ServiceLogger;
}

const toGrade = (score: number): AutomationHealthGrade => {
  if (score >= HEALTHY_GRADE_THRESHOLD) {
    return 'healthy';
  }

  if (score >= ATTENTION_GRADE_THRESHOLD) {
    return 'attention';
  }

  return 'critical';
};

const computeCiReliability = (
  recentRuns: WorkflowRun[],
): AutomationHealthCiReliability => {
  const consideredRuns = recentRuns.filter(
    (run) =>
      run.conclusion !== null &&
      !NON_INFORMATIVE_CONCLUSIONS.has(run.conclusion),
  );
  const successfulRuns = consideredRuns.filter(
    (run) => run.conclusion === 'success',
  );
  const earnedPoints =
    consideredRuns.length === 0
      ? 0
      : Math.round(
          (CI_RELIABILITY_WEIGHT * successfulRuns.length) /
            consideredRuns.length,
        );

  return {
    weight: CI_RELIABILITY_WEIGHT,
    earnedPoints,
    consideredRunCount: consideredRuns.length,
    successfulRunCount: successfulRuns.length,
  };
};

const clampScore = (value: number): number => {
  return Math.min(100, Math.max(0, value));
};

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

    const signals: AutomationHealthSignal[] = evaluatePolicySignals({
      workflows,
      reviewedPullRequestCount: reviewSummaries.length,
    }).map((signal) => {
      const weight = POLICY_SIGNAL_WEIGHTS[signal.policyKey];

      return {
        policyKey: signal.policyKey,
        status: signal.status,
        weight,
        earnedPoints: signal.status === 'compliant' ? weight : 0,
        details: signal.details,
      };
    });

    const ciReliability = computeCiReliability(recentRuns);

    const openPullRequestIds = new Set(
      pullRequests
        .filter((pullRequest) => pullRequest.state === 'open')
        .map((pullRequest) => pullRequest.id),
    );
    const openBlockersCount = reviewSummaries
      .filter((summary) => openPullRequestIds.has(summary.pullRequestId))
      .reduce((total, summary) => total + summary.blockersCount, 0);
    const blockersPenalty: AutomationHealthBlockersPenalty = {
      openBlockersCount,
      penaltyPoints: Math.min(
        MAX_BLOCKERS_PENALTY,
        BLOCKER_PENALTY_POINTS * openBlockersCount,
      ),
    };

    const signalPoints = signals.reduce(
      (total, signal) => total + signal.earnedPoints,
      0,
    );
    const score = clampScore(
      signalPoints + ciReliability.earnedPoints - blockersPenalty.penaltyPoints,
    );

    const healthScore: AutomationHealthScore = {
      repositoryId: repository.id,
      fullName: repository.fullName,
      score,
      grade: toGrade(score),
      signals,
      ciReliability,
      blockersPenalty,
      computedAt: new Date(),
    };

    this.logger.info(
      {
        event: 'automation_health_score_computed',
        repositoryId: repository.id,
        fullName: repository.fullName,
        score,
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
