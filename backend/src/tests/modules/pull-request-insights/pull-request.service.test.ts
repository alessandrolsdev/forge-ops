import { describe, expect, it, vi } from 'vitest';
import { GitHubPullRequestSyncError } from '../../../modules/github/github-app.errors.js';
import type { Repository } from '../../../modules/repository-registry/repository.entity.js';
import { RepositoryNotFoundError } from '../../../modules/repository-registry/repository.errors.js';
import type {
  PullRequest,
  PullRequestState,
} from '../../../modules/pull-request-insights/pull-request.entity.js';
import { PullRequestService } from '../../../modules/pull-request-insights/pull-request.service.js';

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
});
