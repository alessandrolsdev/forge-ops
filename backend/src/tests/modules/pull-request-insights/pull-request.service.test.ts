import { describe, expect, it, vi } from 'vitest';
import { GitHubPullRequestSyncError } from '../../../modules/github/github-app.errors.js';
import type { Repository } from '../../../modules/repository-registry/repository.entity.js';
import { RepositoryNotFoundError } from '../../../modules/repository-registry/repository.errors.js';
import type { CodexReviewSummary } from '../../../modules/pull-request-insights/codex-review-summary.entity.js';
import type {
  PullRequest,
  PullRequestState,
} from '../../../modules/pull-request-insights/pull-request.entity.js';
import { PullRequestNotFoundError } from '../../../modules/pull-request-insights/pull-request.errors.js';
import { PullRequestService } from '../../../modules/pull-request-insights/pull-request.service.js';
import type { Workflow } from '../../../modules/workflow-catalog/workflow.entity.js';
import type { WorkflowRun } from '../../../modules/workflow-runs/workflow-run.entity.js';

const buildRepository = (overrides: Partial<Repository> = {}): Repository => {
  const createdAt = new Date('2026-03-31T18:00:00.000Z');

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

const buildPullRequest = (
  overrides: Partial<PullRequest> = {},
): PullRequest => {
  const createdAt = new Date('2026-03-31T18:10:00.000Z');

  return {
    id: 'pr_123',
    repositoryId: 'repo_123',
    githubPrId: '987654321',
    number: 42,
    title: 'Add pull request insights',
    state: 'open',
    author: 'alessandrolsdev',
    baseBranch: 'main',
    headBranch: 'feature/pull-request-insights',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const buildRemotePullRequest = (
  overrides: Partial<{
    githubPrId: string;
    number: number;
    title: string;
    state: PullRequestState;
    author: string;
    baseBranch: string;
    headBranch: string;
  }> = {},
) => {
  return {
    githubPrId: '987654321',
    number: 42,
    title: 'Add pull request insights',
    state: 'open' as const,
    author: 'alessandrolsdev',
    baseBranch: 'main',
    headBranch: 'feature/pull-request-insights',
    ...overrides,
  };
};

const buildWorkflow = (overrides: Partial<Workflow> = {}): Workflow => {
  const createdAt = new Date('2026-03-31T18:05:00.000Z');

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

const buildWorkflowRun = (overrides: Partial<WorkflowRun> = {}): WorkflowRun => {
  const startedAt = new Date('2026-03-31T18:40:00.000Z');

  return {
    id: 'run_123',
    workflowId: 'workflow_123',
    githubRunId: 'run-gh-123',
    status: 'completed',
    conclusion: 'success',
    branch: 'feature/pull-request-insights',
    sha: 'abc123def456',
    event: 'pull_request',
    startedAt,
    finishedAt: new Date('2026-03-31T18:45:00.000Z'),
    durationMs: 300000,
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
};

const buildCodexReviewSummary = (
  overrides: Partial<CodexReviewSummary> = {},
): CodexReviewSummary => {
  const createdAt = new Date('2026-03-31T18:50:00.000Z');

  return {
    id: 'summary_123',
    pullRequestId: 'pr_123',
    source: 'github_review',
    summary: 'Codex sinalizou 2 achados relevantes.',
    blockersCount: 1,
    suggestionsCount: 1,
    risksCount: 2,
    rawContent: '[src/api.ts]\n[P1] Validar input',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

describe('PullRequestService', () => {
  it('should list pull requests for a monitored repository', async () => {
    const findById = vi.fn().mockResolvedValue(buildRepository());
    const listByRepositoryId = vi.fn().mockResolvedValue([
      buildPullRequest({
        id: 'pr_456',
        githubPrId: '987654322',
        number: 43,
        title: 'Close flaky workflow gap',
        state: 'merged',
      }),
      buildPullRequest(),
    ]);
    const service = new PullRequestService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById,
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId,
        findById: vi.fn(),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: true,
        getStatus: () => ({
          mode: 'github-app',
          configured: true,
          appId: '12****56',
          installationId: '78****10',
          webhookConfigured: true,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => [],
        listPullRequestReviewComments: async () => [],
      },
    });

    await expect(service.listByRepositoryId('repo_123')).resolves.toEqual([
      buildPullRequest({
        id: 'pr_456',
        githubPrId: '987654322',
        number: 43,
        title: 'Close flaky workflow gap',
        state: 'merged',
      }),
      buildPullRequest(),
    ]);

    expect(findById).toHaveBeenCalledWith('repo_123');
    expect(listByRepositoryId).toHaveBeenCalledWith('repo_123');
  });

  it('should return an empty list when the repository has no persisted pull requests', async () => {
    const listByRepositoryId = vi.fn().mockResolvedValue([]);
    const service = new PullRequestService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId,
        findById: vi.fn(),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: true,
        getStatus: () => ({
          mode: 'github-app',
          configured: true,
          appId: '12****56',
          installationId: '78****10',
          webhookConfigured: true,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => [],
        listPullRequestReviewComments: async () => [],
      },
    });

    await expect(service.listByRepositoryId('repo_123')).resolves.toEqual([]);
    expect(listByRepositoryId).toHaveBeenCalledWith('repo_123');
  });

  it('should sync pull requests for a monitored repository', async () => {
    const findById = vi.fn().mockResolvedValue(buildRepository());
    const listPullRequests = vi.fn().mockResolvedValue([
      buildRemotePullRequest(),
      buildRemotePullRequest({
        githubPrId: '987654322',
        number: 43,
        title: 'Close flaky workflow gap',
        state: 'merged',
      }),
    ]);
    const upsert = vi
      .fn()
      .mockResolvedValueOnce(buildPullRequest())
      .mockResolvedValueOnce(
        buildPullRequest({
          id: 'pr_456',
          githubPrId: '987654322',
          number: 43,
          title: 'Close flaky workflow gap',
          state: 'merged',
        }),
      );
    const syncByPullRequest = vi.fn().mockResolvedValue(null);
    const service = new PullRequestService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById,
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert,
        listByRepositoryId: vi.fn(),
        findById: vi.fn(),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: true,
        getStatus: () => ({
          mode: 'github-app',
          configured: true,
          appId: '12****56',
          installationId: '78****10',
          webhookConfigured: true,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests,
        listPullRequestReviewComments: async () => [],
      },
      codexReviewSummaryService: {
        syncByPullRequest,
      },
    });

    await expect(service.syncByRepositoryId('repo_123')).resolves.toEqual([
      buildPullRequest(),
      buildPullRequest({
        id: 'pr_456',
        githubPrId: '987654322',
        number: 43,
        title: 'Close flaky workflow gap',
        state: 'merged',
      }),
    ]);

    expect(findById).toHaveBeenCalledWith('repo_123');
    expect(listPullRequests).toHaveBeenCalledWith({
      owner: 'forgeops',
      name: 'backend',
    });
    expect(upsert).toHaveBeenNthCalledWith(1, {
      repositoryId: 'repo_123',
      githubPrId: '987654321',
      number: 42,
      title: 'Add pull request insights',
      state: 'open',
      author: 'alessandrolsdev',
      baseBranch: 'main',
      headBranch: 'feature/pull-request-insights',
    });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      repositoryId: 'repo_123',
      githubPrId: '987654322',
      number: 43,
      title: 'Close flaky workflow gap',
      state: 'merged',
      author: 'alessandrolsdev',
      baseBranch: 'main',
      headBranch: 'feature/pull-request-insights',
    });
    expect(syncByPullRequest).toHaveBeenNthCalledWith(1, buildPullRequest());
    expect(syncByPullRequest).toHaveBeenNthCalledWith(
      2,
      buildPullRequest({
        id: 'pr_456',
        githubPrId: '987654322',
        number: 43,
        title: 'Close flaky workflow gap',
        state: 'merged',
      }),
    );
  });

  it('should return an empty list when GitHub has no pull requests for the repository', async () => {
    const listPullRequests = vi.fn().mockResolvedValue([]);
    const service = new PullRequestService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn(),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: true,
        getStatus: () => ({
          mode: 'github-app',
          configured: true,
          appId: '12****56',
          installationId: '78****10',
          webhookConfigured: true,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests,
        listPullRequestReviewComments: async () => [],
      },
    });

    await expect(service.syncByRepositoryId('repo_123')).resolves.toEqual([]);
    expect(listPullRequests).toHaveBeenCalledWith({
      owner: 'forgeops',
      name: 'backend',
    });
  });

  it('should fail with repository not found for an unknown repository id', async () => {
    const service = new PullRequestService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn(),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: true,
        getStatus: () => ({
          mode: 'github-app',
          configured: true,
          appId: '12****56',
          installationId: '78****10',
          webhookConfigured: true,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => [],
        listPullRequestReviewComments: async () => [],
      },
    });

    await expect(service.listByRepositoryId('repo_missing')).rejects.toBeInstanceOf(
      RepositoryNotFoundError,
    );
  });

  it('should log and rethrow safe GitHub sync errors', async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new PullRequestService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn(),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: true,
        getStatus: () => ({
          mode: 'github-app',
          configured: true,
          appId: '12****56',
          installationId: '78****10',
          webhookConfigured: true,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => {
          throw new GitHubPullRequestSyncError();
        },
        listPullRequestReviewComments: async () => [],
      },
      logger,
    });

    await expect(service.syncByRepositoryId('repo_123')).rejects.toBeInstanceOf(
      GitHubPullRequestSyncError,
    );

    expect(logger.error).toHaveBeenCalledWith(
      {
        event: 'pull_request_sync_failed',
        repositoryId: 'repo_123',
        fullName: 'forgeops/backend',
        errorCode: 'github_pull_request_sync_unavailable',
        errorStatusCode: 503,
      },
      'Pull request sync failed.',
    );
  });

  it('should continue pull request sync when codex review summary sync fails', async () => {
    const findById = vi.fn().mockResolvedValue(buildRepository());
    const listPullRequests = vi.fn().mockResolvedValue([buildRemotePullRequest()]);
    const upsert = vi.fn().mockResolvedValue(buildPullRequest());
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new PullRequestService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById,
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert,
        listByRepositoryId: vi.fn(),
        findById: vi.fn(),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: true,
        getStatus: () => ({
          mode: 'github-app',
          configured: true,
          appId: '12****56',
          installationId: '78****10',
          webhookConfigured: true,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests,
        listPullRequestReviewComments: async () => [],
      },
      codexReviewSummaryService: {
        syncByPullRequest: vi.fn().mockRejectedValue(new Error('upstream timeout')),
      },
      logger,
    });

    await expect(service.syncByRepositoryId('repo_123')).resolves.toEqual([
      buildPullRequest(),
    ]);

    expect(logger.error).toHaveBeenCalledWith(
      {
        event: 'codex_review_summary_sync_failed_non_blocking',
        repositoryId: 'repo_123',
        pullRequestId: 'pr_123',
        githubPrId: '987654321',
        githubPrNumber: 42,
        errorName: 'Error',
      },
      'Codex review summary sync failed, but pull request sync will continue.',
    );
    expect(logger.info).toHaveBeenCalledWith(
      {
        event: 'pull_request_sync_succeeded',
        repositoryId: 'repo_123',
        fullName: 'forgeops/backend',
        remotePullRequestCount: 1,
        persistedPullRequestCount: 1,
      },
      'Pull request sync completed.',
    );
  });

  it('should return pull request detail with summary and linked workflow runs', async () => {
    const service = new PullRequestService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildPullRequest()),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn().mockResolvedValue([
          buildWorkflow(),
          buildWorkflow({
            id: 'workflow_456',
            githubWorkflowId: 'workflow-gh-456',
            name: 'Deploy',
          }),
        ]),
        findById: vi.fn(),
      },
      workflowRunRepository: {
        createRun: vi.fn(),
        upsertRun: vi.fn(),
        listRunsByWorkflowId: vi
          .fn()
          .mockResolvedValueOnce([
            buildWorkflowRun(),
            buildWorkflowRun({
              id: 'run_old',
              githubRunId: 'run-gh-old',
              createdAt: new Date('2026-03-31T18:00:00.000Z'),
              startedAt: new Date('2026-03-31T18:00:00.000Z'),
              finishedAt: new Date('2026-03-31T18:04:00.000Z'),
            }),
            buildWorkflowRun({
              id: 'run_other_branch',
              githubRunId: 'run-gh-other',
              branch: 'main',
            }),
          ])
          .mockResolvedValueOnce([
            buildWorkflowRun({
              id: 'run_456',
              workflowId: 'workflow_456',
              githubRunId: 'run-gh-456',
              status: 'in_progress',
              conclusion: null,
              startedAt: new Date('2026-03-31T19:00:00.000Z'),
              finishedAt: null,
              createdAt: new Date('2026-03-31T19:00:00.000Z'),
              updatedAt: new Date('2026-03-31T19:00:00.000Z'),
            }),
          ]),
        findRunById: vi.fn(),
        createJob: vi.fn(),
        upsertJob: vi.fn(),
        listJobsByWorkflowRunId: vi.fn(),
      },
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn().mockResolvedValue(buildCodexReviewSummary()),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: true,
        getStatus: () => ({
          mode: 'github-app',
          configured: true,
          appId: '12****56',
          installationId: '78****10',
          webhookConfigured: true,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => [],
        listPullRequestReviewComments: async () => [],
      },
    });

    await expect(service.getDetailById('repo_123', 'pr_123')).resolves.toEqual({
      id: 'pr_123',
      number: 42,
      title: 'Add pull request insights',
      status: 'open',
      author: 'alessandrolsdev',
      summary: {
        blockersCount: 1,
        risksCount: 2,
        suggestionsCount: 1,
        lastReviewedAt: new Date('2026-03-31T18:50:00.000Z'),
      },
      workflows: [
        {
          name: 'Deploy',
          status: 'in_progress',
          conclusion: null,
          startedAt: new Date('2026-03-31T19:00:00.000Z'),
          finishedAt: null,
        },
        {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          startedAt: new Date('2026-03-31T18:40:00.000Z'),
          finishedAt: new Date('2026-03-31T18:45:00.000Z'),
        },
      ],
    });
  });

  it('should return pull request detail without summary', async () => {
    const service = new PullRequestService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildPullRequest()),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn().mockResolvedValue([buildWorkflow()]),
        findById: vi.fn(),
      },
      workflowRunRepository: {
        createRun: vi.fn(),
        upsertRun: vi.fn(),
        listRunsByWorkflowId: vi.fn().mockResolvedValue([buildWorkflowRun()]),
        findRunById: vi.fn(),
        createJob: vi.fn(),
        upsertJob: vi.fn(),
        listJobsByWorkflowRunId: vi.fn(),
      },
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn().mockResolvedValue(null),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: true,
        getStatus: () => ({
          mode: 'github-app',
          configured: true,
          appId: '12****56',
          installationId: '78****10',
          webhookConfigured: true,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => [],
        listPullRequestReviewComments: async () => [],
      },
    });

    await expect(service.getDetailById('repo_123', 'pr_123')).resolves.toEqual({
      id: 'pr_123',
      number: 42,
      title: 'Add pull request insights',
      status: 'open',
      author: 'alessandrolsdev',
      summary: null,
      workflows: [
        {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          startedAt: new Date('2026-03-31T18:40:00.000Z'),
          finishedAt: new Date('2026-03-31T18:45:00.000Z'),
        },
      ],
    });
  });

  it('should return pull request detail without linked workflows', async () => {
    const service = new PullRequestService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildPullRequest()),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn().mockResolvedValue([]),
        findById: vi.fn(),
      },
      workflowRunRepository: {
        createRun: vi.fn(),
        upsertRun: vi.fn(),
        listRunsByWorkflowId: vi.fn(),
        findRunById: vi.fn(),
        createJob: vi.fn(),
        upsertJob: vi.fn(),
        listJobsByWorkflowRunId: vi.fn(),
      },
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn().mockResolvedValue(buildCodexReviewSummary()),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: true,
        getStatus: () => ({
          mode: 'github-app',
          configured: true,
          appId: '12****56',
          installationId: '78****10',
          webhookConfigured: true,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => [],
        listPullRequestReviewComments: async () => [],
      },
    });

    await expect(service.getDetailById('repo_123', 'pr_123')).resolves.toEqual({
      id: 'pr_123',
      number: 42,
      title: 'Add pull request insights',
      status: 'open',
      author: 'alessandrolsdev',
      summary: {
        blockersCount: 1,
        risksCount: 2,
        suggestionsCount: 1,
        lastReviewedAt: new Date('2026-03-31T18:50:00.000Z'),
      },
      workflows: [],
    });
  });

  it('should fail with pull request not found when the pull request does not exist', async () => {
    const service = new PullRequestService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: true,
        getStatus: () => ({
          mode: 'github-app',
          configured: true,
          appId: '12****56',
          installationId: '78****10',
          webhookConfigured: true,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => [],
        listPullRequestReviewComments: async () => [],
      },
    });

    await expect(service.getDetailById('repo_123', 'pr_missing')).rejects.toBeInstanceOf(
      PullRequestNotFoundError,
    );
  });
});
