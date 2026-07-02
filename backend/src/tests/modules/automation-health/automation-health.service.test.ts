import { describe, expect, it, vi } from 'vitest';
import { RepositoryNotFoundError } from '../../../modules/repository-registry/repository.errors.js';
import { AutomationHealthService } from '../../../modules/automation-health/automation-health.service.js';
import type { Repository } from '../../../modules/repository-registry/repository.entity.js';
import type { Workflow } from '../../../modules/workflow-catalog/workflow.entity.js';
import type { WorkflowRun } from '../../../modules/workflow-runs/workflow-run.entity.js';
import type { PullRequest } from '../../../modules/pull-request-insights/pull-request.entity.js';
import type { CodexReviewSummary } from '../../../modules/pull-request-insights/codex-review-summary.entity.js';

const buildRepository = (overrides: Partial<Repository> = {}): Repository => {
  const createdAt = new Date('2026-03-27T16:45:00.000Z');

  return {
    id: 'repo_123',
    githubRepoId: '123456789',
    owner: 'forgeops',
    name: 'backend',
    fullName: 'forgeops/backend',
    defaultBranch: 'main',
    isActive: true,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const buildWorkflow = (overrides: Partial<Workflow> = {}): Workflow => {
  const createdAt = new Date('2026-03-30T15:10:00.000Z');

  return {
    id: 'workflow_123',
    repositoryId: 'repo_123',
    githubWorkflowId: 'workflow-gh-123',
    name: 'CI',
    path: '.github/workflows/ci.yml',
    state: 'active',
    sourceType: 'local',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const buildRun = (overrides: Partial<WorkflowRun> = {}): WorkflowRun => {
  const startedAt = new Date('2026-03-30T16:00:00.000Z');

  return {
    id: 'run_123',
    workflowId: 'workflow_123',
    githubRunId: 'run-gh-123',
    status: 'completed',
    conclusion: 'success',
    branch: 'main',
    sha: 'abc123',
    event: 'push',
    startedAt,
    finishedAt: new Date('2026-03-30T16:05:00.000Z'),
    durationMs: 300000,
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
};

const buildPullRequest = (overrides: Partial<PullRequest> = {}): PullRequest => {
  const createdAt = new Date('2026-03-31T18:20:00.000Z');

  return {
    id: 'pr_123',
    repositoryId: 'repo_123',
    githubPrId: '987654321',
    number: 42,
    title: 'Add automation health',
    state: 'open',
    author: 'alessandrolsdev',
    baseBranch: 'main',
    headBranch: 'feature/automation-health',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const buildSummary = (
  overrides: Partial<CodexReviewSummary> = {},
): CodexReviewSummary => {
  const createdAt = new Date('2026-03-31T18:50:00.000Z');

  return {
    id: 'summary_123',
    pullRequestId: 'pr_123',
    source: 'github_review',
    summary: 'Codex review',
    blockersCount: 0,
    suggestionsCount: 0,
    risksCount: 0,
    rawContent: '',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const fullyAutomatedWorkflows = [
  buildWorkflow({ id: 'w1', name: 'Lint', path: '.github/workflows/lint.yml' }),
  buildWorkflow({ id: 'w2', name: 'Test', path: '.github/workflows/test.yml' }),
  buildWorkflow({
    id: 'w3',
    name: 'Codex Review',
    path: '.github/workflows/codex-review.yml',
  }),
  buildWorkflow({
    id: 'w4',
    name: 'Security Scan',
    path: '.github/workflows/security.yml',
  }),
  buildWorkflow({
    id: 'w5',
    name: 'Reusable CI',
    path: '.github/workflows/reusable-ci.yml',
    sourceType: 'reusable',
  }),
];

interface ServiceFixture {
  repositories?: Repository[];
  workflows?: Workflow[];
  recentRuns?: WorkflowRun[];
  pullRequests?: PullRequest[];
  summaries?: CodexReviewSummary[];
}

const createService = (fixture: ServiceFixture = {}) => {
  const repositories = fixture.repositories ?? [buildRepository()];

  return new AutomationHealthService({
    repositoryRegistryRepository: {
      create: vi.fn(),
      list: vi.fn().mockResolvedValue(repositories),
      findById: vi
        .fn()
        .mockImplementation(async (id: string) =>
          repositories.find((repository) => repository.id === id) ?? null,
        ),
      deleteById: vi.fn(),
    },
    workflowRepository: {
      create: vi.fn(),
      upsert: vi.fn(),
      listByRepositoryId: vi
        .fn()
        .mockImplementation(async (repositoryId: string) =>
          (fixture.workflows ?? []).filter(
            (workflow) => workflow.repositoryId === repositoryId,
          ),
        ),
      findById: vi.fn(),
    },
    workflowRunRepository: {
      createRun: vi.fn(),
      upsertRun: vi.fn(),
      listRunsByWorkflowId: vi.fn(),
      listRecentCompletedRunsByRepositoryId: vi
        .fn()
        .mockResolvedValue(fixture.recentRuns ?? []),
      findRunById: vi.fn(),
      createJob: vi.fn(),
      upsertJob: vi.fn(),
      listJobsByWorkflowRunId: vi.fn(),
    },
    pullRequestRepository: {
      create: vi.fn(),
      upsert: vi.fn(),
      listByRepositoryId: vi
        .fn()
        .mockImplementation(async (repositoryId: string) =>
          (fixture.pullRequests ?? []).filter(
            (pullRequest) => pullRequest.repositoryId === repositoryId,
          ),
        ),
      findById: vi.fn(),
    },
    codexReviewSummaryRepository: {
      create: vi.fn(),
      upsert: vi.fn(),
      findByPullRequestId: vi.fn(),
      listByRepositoryId: vi.fn().mockResolvedValue(fixture.summaries ?? []),
    },
  });
};

describe('AutomationHealthService', () => {
  it('scores 100 with a healthy grade for a fully automated repository', async () => {
    const service = createService({
      workflows: fullyAutomatedWorkflows,
      recentRuns: Array.from({ length: 20 }, (_, index) =>
        buildRun({ id: `run_${index}`, githubRunId: `gh_${index}` }),
      ),
      pullRequests: [buildPullRequest()],
      summaries: [buildSummary()],
    });

    const healthScore = await service.getScoreByRepositoryId('repo_123');

    expect(healthScore.score).toBe(100);
    expect(healthScore.grade).toBe('healthy');
    expect(healthScore.ciReliability).toEqual({
      weight: 25,
      earnedPoints: 25,
      consideredRunCount: 20,
      successfulRunCount: 20,
    });
    expect(healthScore.blockersPenalty).toEqual({
      openBlockersCount: 0,
      penaltyPoints: 0,
    });
    expect(healthScore.signals.every((signal) => signal.status === 'compliant')).toBe(
      true,
    );
  });

  it('scores 0 with a critical grade for a repository without any automation', async () => {
    const service = createService();

    const healthScore = await service.getScoreByRepositoryId('repo_123');

    expect(healthScore.score).toBe(0);
    expect(healthScore.grade).toBe('critical');
    expect(healthScore.ciReliability.earnedPoints).toBe(0);
    expect(healthScore.ciReliability.consideredRunCount).toBe(0);
  });

  it('rounds ci reliability from the success ratio of recent runs', async () => {
    const service = createService({
      workflows: [buildWorkflow({ id: 'w1' })],
      recentRuns: [
        ...Array.from({ length: 15 }, (_, index) =>
          buildRun({ id: `ok_${index}`, githubRunId: `ok_${index}` }),
        ),
        ...Array.from({ length: 5 }, (_, index) =>
          buildRun({
            id: `fail_${index}`,
            githubRunId: `fail_${index}`,
            conclusion: 'failure',
          }),
        ),
      ],
    });

    const healthScore = await service.getScoreByRepositoryId('repo_123');

    // 25 * 15/20 = 18.75 -> 19
    expect(healthScore.ciReliability.earnedPoints).toBe(19);
    expect(healthScore.ciReliability.consideredRunCount).toBe(20);
    expect(healthScore.ciReliability.successfulRunCount).toBe(15);
  });

  it('excludes skipped and neutral conclusions from the reliability sample', async () => {
    const service = createService({
      workflows: [buildWorkflow({ id: 'w1' })],
      recentRuns: [
        buildRun({ id: 'ok_1', githubRunId: 'ok_1' }),
        buildRun({ id: 'skip_1', githubRunId: 'skip_1', conclusion: 'skipped' }),
        buildRun({ id: 'neutral_1', githubRunId: 'neutral_1', conclusion: 'neutral' }),
        buildRun({ id: 'fail_1', githubRunId: 'fail_1', conclusion: 'failure' }),
      ],
    });

    const healthScore = await service.getScoreByRepositoryId('repo_123');

    expect(healthScore.ciReliability.consideredRunCount).toBe(2);
    expect(healthScore.ciReliability.successfulRunCount).toBe(1);
    expect(healthScore.ciReliability.earnedPoints).toBe(13);
  });

  it('penalizes blockers on open pull requests and caps the penalty at 15', async () => {
    const service = createService({
      workflows: fullyAutomatedWorkflows,
      recentRuns: [buildRun()],
      pullRequests: [
        buildPullRequest(),
        buildPullRequest({ id: 'pr_closed', githubPrId: '2', number: 43, state: 'closed' }),
      ],
      summaries: [
        buildSummary({ pullRequestId: 'pr_123', blockersCount: 4 }),
        buildSummary({
          id: 'summary_closed',
          pullRequestId: 'pr_closed',
          blockersCount: 9,
        }),
      ],
    });

    const healthScore = await service.getScoreByRepositoryId('repo_123');

    // 4 blockers abertos * 3 = 12; blockers de PR fechada nao penalizam.
    expect(healthScore.blockersPenalty).toEqual({
      openBlockersCount: 4,
      penaltyPoints: 12,
    });

    const cappedService = createService({
      workflows: fullyAutomatedWorkflows,
      recentRuns: [buildRun()],
      pullRequests: [buildPullRequest()],
      summaries: [buildSummary({ pullRequestId: 'pr_123', blockersCount: 10 })],
    });

    const cappedScore = await cappedService.getScoreByRepositoryId('repo_123');

    expect(cappedScore.blockersPenalty).toEqual({
      openBlockersCount: 10,
      penaltyPoints: 15,
    });
  });

  it('clamps the final score at zero', async () => {
    const service = createService({
      workflows: [],
      recentRuns: [],
      pullRequests: [buildPullRequest()],
      summaries: [buildSummary({ pullRequestId: 'pr_123', blockersCount: 10 })],
    });

    const healthScore = await service.getScoreByRepositoryId('repo_123');

    // automated_review_present (15) - penalidade (15) = 0
    expect(healthScore.score).toBe(0);
    expect(healthScore.grade).toBe('critical');
  });

  it('maps score boundaries to the expected grades', async () => {
    // 80 pontos: sinais completos (75) + reliability 5/20 sucesso -> 6... construir com precisao:
    // sinais completos = 75; reliability earned 5 => score 80 (healthy boundary)
    const healthyService = createService({
      workflows: fullyAutomatedWorkflows,
      recentRuns: [
        buildRun({ id: 'ok', githubRunId: 'ok' }),
        ...Array.from({ length: 4 }, (_, index) =>
          buildRun({
            id: `fail_${index}`,
            githubRunId: `fail_${index}`,
            conclusion: 'failure',
          }),
        ),
      ],
      pullRequests: [buildPullRequest()],
      summaries: [buildSummary()],
    });

    const healthyScore = await healthyService.getScoreByRepositoryId('repo_123');

    // 75 + round(25 * 1/5) = 75 + 5 = 80
    expect(healthyScore.score).toBe(80);
    expect(healthyScore.grade).toBe('healthy');

    // 79 pontos: 75 + 5 - penalidade 1 blocker (3) = 77 -> attention
    const attentionService = createService({
      workflows: fullyAutomatedWorkflows,
      recentRuns: [
        buildRun({ id: 'ok', githubRunId: 'ok' }),
        ...Array.from({ length: 4 }, (_, index) =>
          buildRun({
            id: `fail_${index}`,
            githubRunId: `fail_${index}`,
            conclusion: 'failure',
          }),
        ),
      ],
      pullRequests: [buildPullRequest()],
      summaries: [buildSummary({ blockersCount: 1 })],
    });

    const attentionScore = await attentionService.getScoreByRepositoryId('repo_123');

    expect(attentionScore.score).toBe(77);
    expect(attentionScore.grade).toBe('attention');

    // critical: somente CI presente (15) + reliability 0 -> 15
    const criticalService = createService({
      workflows: [buildWorkflow({ id: 'w1', name: 'Pipeline', path: 'p.yml' })],
    });

    const criticalScore = await criticalService.getScoreByRepositoryId('repo_123');

    expect(criticalScore.score).toBe(15);
    expect(criticalScore.grade).toBe('critical');
  });

  it('throws RepositoryNotFoundError for an unknown repository', async () => {
    const service = createService();

    await expect(
      service.getScoreByRepositoryId('repo_missing'),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });

  it('lists the overview ordered from worst to best score and skips inactive repositories', async () => {
    const service = createService({
      repositories: [
        buildRepository({ id: 'repo_a', fullName: 'forgeops/a' }),
        buildRepository({ id: 'repo_b', fullName: 'forgeops/b' }),
        buildRepository({
          id: 'repo_inactive',
          fullName: 'forgeops/inactive',
          isActive: false,
        }),
      ],
      workflows: [
        buildWorkflow({ id: 'w_b', repositoryId: 'repo_b', name: 'Lint e Test', path: 'lint-test.yml' }),
      ],
    });

    const overview = await service.getOverview();

    expect(overview.map((entry) => entry.repositoryId)).toEqual([
      'repo_a',
      'repo_b',
    ]);
    expect(overview[0]!.score).toBeLessThanOrEqual(overview[1]!.score);
  });
});
