import { describe, expect, it, vi } from 'vitest';
import { GitHubPullRequestReviewSyncError } from '../../../modules/github/github-app.errors.js';
import type { Repository } from '../../../modules/repository-registry/repository.entity.js';
import { RepositoryNotFoundError } from '../../../modules/repository-registry/repository.errors.js';
import type { CodexReviewSummary } from '../../../modules/pull-request-insights/codex-review-summary.entity.js';
import { CodexReviewSummaryService } from '../../../modules/pull-request-insights/codex-review-summary.service.js';
import type { PullRequest } from '../../../modules/pull-request-insights/pull-request.entity.js';
import { PullRequestNotFoundError } from '../../../modules/pull-request-insights/pull-request.errors.js';

const buildRepository = (overrides: Partial<Repository> = {}): Repository => {
  const createdAt = new Date('2026-04-02T00:00:00.000Z');

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

const buildPullRequest = (overrides: Partial<PullRequest> = {}): PullRequest => {
  const createdAt = new Date('2026-04-02T00:05:00.000Z');

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

const buildSummary = (
  overrides: Partial<CodexReviewSummary> = {},
): CodexReviewSummary => {
  const createdAt = new Date('2026-04-02T00:08:00.000Z');

  return {
    id: 'summary_123',
    pullRequestId: 'pr_123',
    source: 'github_review',
    summary:
      'Codex sinalizou 2 achados no pull request: [P1] Validar input da rota; [P2] Cobrir fluxo vazio',
    blockersCount: 1,
    suggestionsCount: 1,
    risksCount: 0,
    rawContent:
      '[src/api.ts]\n[P1] Validar input da rota\n\n---\n\n[src/tests/api.test.ts]\n[P2] Cobrir fluxo vazio',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

describe('CodexReviewSummaryService', () => {
  it('should return a persisted summary by pull request id', async () => {
    const findByPullRequestId = vi.fn().mockResolvedValue(buildSummary());
    const service = new CodexReviewSummaryService({
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
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId,
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

    await expect(service.findByPullRequestId('pr_123')).resolves.toEqual(
      buildSummary(),
    );
    expect(findByPullRequestId).toHaveBeenCalledWith('pr_123');
  });

  it('should fail with pull request not found when reading an unknown summary', async () => {
    const service = new CodexReviewSummaryService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn(),
        deleteById: vi.fn(),
      },
      pullRequestRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
      },
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn(),
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

    await expect(service.findByPullRequestId('pr_missing')).rejects.toBeInstanceOf(
      PullRequestNotFoundError,
    );
  });

  it('should sync codex review comments into a persisted summary', async () => {
    const upsert = vi.fn().mockResolvedValue(buildSummary());
    const listPullRequestReviewComments = vi.fn().mockResolvedValue([
      {
        githubReviewCommentId: 'comment_2',
        reviewerLogin: 'Codex-bot',
        body: '[P2] Cobrir fluxo vazio',
        path: 'src/tests/api.test.ts',
        createdAt: new Date('2026-04-02T00:07:00.000Z'),
      },
      {
        githubReviewCommentId: 'comment_1',
        reviewerLogin: 'codex-reviewer',
        body: '[P1] Validar input da rota',
        path: 'src/api.ts',
        createdAt: new Date('2026-04-02T00:08:00.000Z'),
      },
      {
        githubReviewCommentId: 'comment_ignored',
        reviewerLogin: 'alice',
        body: 'Parece bom',
        path: 'src/api.ts',
        createdAt: new Date('2026-04-02T00:09:00.000Z'),
      },
    ]);
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new CodexReviewSummaryService({
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
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert,
        findByPullRequestId: vi.fn(),
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
        listPullRequestReviewComments,
      },
      logger,
    });

    await expect(service.syncByPullRequestId('pr_123')).resolves.toEqual(
      buildSummary(),
    );

    expect(listPullRequestReviewComments).toHaveBeenCalledWith(
      {
        owner: 'forgeops',
        name: 'backend',
      },
      42,
    );
    expect(upsert).toHaveBeenCalledWith({
      pullRequestId: 'pr_123',
      source: 'github_review',
      summary:
        'Codex sinalizou 2 achados no pull request: [P1] Validar input da rota; [P2] Cobrir fluxo vazio',
      blockersCount: 1,
      suggestionsCount: 1,
      risksCount: 0,
      rawContent:
        '[src/api.ts]\n[P1] Validar input da rota\n\n---\n\n[src/tests/api.test.ts]\n[P2] Cobrir fluxo vazio',
    });
    expect(logger.info).toHaveBeenCalledWith(
      {
        event: 'codex_review_summary_sync_succeeded',
        pullRequestId: 'pr_123',
        repositoryId: 'repo_123',
        githubPrNumber: 42,
        codexCommentCount: 2,
      },
      'Codex review summary sync completed.',
    );
  });

  it('should return null and log a skip when no Codex review comments are available', async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const upsert = vi.fn();
    const service = new CodexReviewSummaryService({
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
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert,
        findByPullRequestId: vi.fn(),
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
        listPullRequestReviewComments: async () => [
          {
            githubReviewCommentId: 'comment_ignored',
            reviewerLogin: 'alice',
            body: 'Parece bom',
            path: 'src/api.ts',
            createdAt: new Date('2026-04-02T00:09:00.000Z'),
          },
        ],
      },
      logger,
    });

    await expect(service.syncByPullRequestId('pr_123')).resolves.toBeNull();
    expect(upsert).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      {
        event: 'codex_review_summary_sync_skipped',
        pullRequestId: 'pr_123',
        repositoryId: 'repo_123',
        githubPrNumber: 42,
      },
      'Codex review summary sync skipped because no Codex review comments were found.',
    );
  });

  it('should fail with repository not found when the pull request repository is missing', async () => {
    const service = new CodexReviewSummaryService({
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
        findById: vi.fn().mockResolvedValue(buildPullRequest()),
      },
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn(),
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

    await expect(service.syncByPullRequestId('pr_123')).rejects.toBeInstanceOf(
      RepositoryNotFoundError,
    );
  });

  it('should log and rethrow safe GitHub review sync errors', async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new CodexReviewSummaryService({
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
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn(),
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
        listPullRequestReviewComments: async () => {
          throw new GitHubPullRequestReviewSyncError();
        },
      },
      logger,
    });

    await expect(service.syncByPullRequestId('pr_123')).rejects.toBeInstanceOf(
      GitHubPullRequestReviewSyncError,
    );
    expect(logger.error).toHaveBeenCalledWith(
      {
        event: 'codex_review_summary_sync_failed',
        pullRequestId: 'pr_123',
        repositoryId: 'repo_123',
        errorName: 'GitHubPullRequestReviewSyncError',
      },
      'Codex review summary sync failed.',
    );
  });
});
