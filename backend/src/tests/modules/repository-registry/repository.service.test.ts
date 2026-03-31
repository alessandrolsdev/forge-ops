import { describe, expect, it, vi } from 'vitest';
import type {
  CreateRepositoryInput,
  Repository,
} from '../../../modules/repository-registry/repository.entity.js';
import type { GitHubInstallationRepository } from '../../../modules/github/github-app.boundary.js';
import {
  GitHubWorkflowCatalogSyncError,
  GitHubPullRequestSyncError,
  GitHubWorkflowRunsSyncError,
} from '../../../modules/github/github-app.errors.js';
import { RepositoryAlreadyExistsError } from '../../../modules/repository-registry/repository.errors.js';
import { RepositoryService } from '../../../modules/repository-registry/repository.service.js';

const buildRepository = (
  overrides: Partial<Repository> = {},
): Repository => {
  const createdAt = new Date('2026-03-27T16:30:00.000Z');

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

const buildCreateInput = (
  overrides: Partial<CreateRepositoryInput> = {},
): CreateRepositoryInput => {
  return {
    githubRepoId: '123456789',
    owner: 'forgeops',
    name: 'backend',
    fullName: 'forgeops/backend',
    defaultBranch: 'main',
    ...overrides,
  };
};

const buildInstallationRepository = (
  overrides: Partial<GitHubInstallationRepository> = {},
): GitHubInstallationRepository => {
  return {
    githubRepoId: '123456789',
    owner: 'forgeops',
    name: 'backend',
    fullName: 'forgeops/backend',
    defaultBranch: 'main',
    isPrivate: true,
    ...overrides,
  };
};

describe('RepositoryService', () => {
  it('should delegate listing repositories to the repository layer', async () => {
    const list = vi.fn().mockResolvedValue([
      buildRepository(),
      buildRepository({
        id: 'repo_456',
        githubRepoId: '987654321',
        fullName: 'forgeops/frontend',
        name: 'frontend',
      }),
    ]);
    const create = vi.fn();
    const service = new RepositoryService({
      repository: {
        list,
        create,
        findById: vi.fn(),
        deleteById: vi.fn(),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: false,
        getStatus: () => ({
          mode: 'github-app',
          configured: false,
          appId: null,
          installationId: null,
          webhookConfigured: false,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => [],
      },
    });

    await expect(service.list()).resolves.toEqual([
      buildRepository(),
      buildRepository({
        id: 'repo_456',
        githubRepoId: '987654321',
        fullName: 'forgeops/frontend',
        name: 'frontend',
      }),
    ]);
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('should delegate repository creation to the repository layer', async () => {
    const create = vi.fn().mockResolvedValue(buildRepository());
    const list = vi.fn();
    const workflowRunSync = {
      syncByRepositoryId: vi.fn().mockResolvedValue([]),
    };
    const pullRequestSync = {
      syncByRepositoryId: vi.fn().mockResolvedValue([]),
    };
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new RepositoryService({
      repository: {
        list,
        create,
        findById: vi.fn(),
        deleteById: vi.fn(),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: false,
        getStatus: () => ({
          mode: 'github-app',
          configured: false,
          appId: null,
          installationId: null,
          webhookConfigured: false,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => [],
      },
      workflowCatalogSync: {
        syncByRepositoryId: vi.fn().mockResolvedValue([]),
      },
      workflowRunSync,
      pullRequestSync,
      logger,
    });

    await expect(service.create(buildCreateInput())).resolves.toEqual(buildRepository());
    expect(create).toHaveBeenCalledWith(buildCreateInput());
    expect(workflowRunSync.syncByRepositoryId).toHaveBeenCalledWith('repo_123');
    expect(pullRequestSync.syncByRepositoryId).toHaveBeenCalledWith('repo_123');
    expect(logger.info).toHaveBeenCalledWith(
      {
        event: 'repository_ingestion_succeeded',
        repositoryId: 'repo_123',
        githubRepoId: '123456789',
        fullName: 'forgeops/backend',
        syncedWorkflowCount: 0,
        syncedWorkflowRunCount: 0,
        syncedPullRequestCount: 0,
      },
      'Repository ingestion completed.',
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should roll back the repository when workflow run sync fails after catalog sync', async () => {
    const deleteById = vi.fn().mockResolvedValue(undefined);
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new RepositoryService({
      repository: {
        list: vi.fn(),
        create: vi.fn().mockResolvedValue(buildRepository()),
        findById: vi.fn(),
        deleteById,
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
      },
      workflowCatalogSync: {
        syncByRepositoryId: vi.fn().mockResolvedValue([]),
      },
      workflowRunSync: {
        syncByRepositoryId: vi.fn().mockRejectedValue(new GitHubWorkflowRunsSyncError()),
      },
      logger,
    });

    await expect(service.create(buildCreateInput())).rejects.toBeInstanceOf(
      GitHubWorkflowRunsSyncError,
    );

    expect(deleteById).toHaveBeenCalledWith('repo_123');
    expect(logger.error).toHaveBeenCalledWith(
      {
        event: 'repository_ingestion_failed',
        repositoryId: 'repo_123',
        githubRepoId: '123456789',
        fullName: 'forgeops/backend',
        errorCode: 'github_workflow_runs_unavailable',
        errorStatusCode: 503,
      },
      'Repository ingestion failed.',
    );
  });

  it('should log repository ingestion failures with safe operational context', async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new RepositoryService({
      repository: {
        list: vi.fn(),
        create: vi.fn().mockRejectedValue(new RepositoryAlreadyExistsError()),
        findById: vi.fn(),
        deleteById: vi.fn(),
      },
      githubBoundary: {
        mode: 'github-app',
        configured: false,
        getStatus: () => ({
          mode: 'github-app',
          configured: false,
          appId: null,
          installationId: null,
          webhookConfigured: false,
        }),
        assertConfigured: () => undefined,
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => [],
      },
      workflowCatalogSync: {
        syncByRepositoryId: vi.fn(),
      },
      logger,
    });

    await expect(service.create(buildCreateInput())).rejects.toBeInstanceOf(
      RepositoryAlreadyExistsError,
    );

    expect(logger.error).toHaveBeenCalledWith(
      {
        event: 'repository_ingestion_failed',
        repositoryId: undefined,
        githubRepoId: '123456789',
        fullName: 'forgeops/backend',
        errorCode: 'repository_already_exists',
        errorStatusCode: 409,
      },
      'Repository ingestion failed.',
    );
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('should roll back the repository when workflow sync fails after creation', async () => {
    const deleteById = vi.fn().mockResolvedValue(undefined);
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new RepositoryService({
      repository: {
        list: vi.fn(),
        create: vi.fn().mockResolvedValue(buildRepository()),
        findById: vi.fn(),
        deleteById,
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
      },
      workflowCatalogSync: {
        syncByRepositoryId: vi
          .fn()
          .mockRejectedValue(new GitHubWorkflowCatalogSyncError()),
      },
      logger,
    });

    await expect(service.create(buildCreateInput())).rejects.toBeInstanceOf(
      GitHubWorkflowCatalogSyncError,
    );

    expect(deleteById).toHaveBeenCalledWith('repo_123');
    expect(logger.error).toHaveBeenCalledWith(
      {
        event: 'repository_ingestion_failed',
        repositoryId: 'repo_123',
        githubRepoId: '123456789',
        fullName: 'forgeops/backend',
        errorCode: 'github_workflow_catalog_unavailable',
        errorStatusCode: 503,
      },
      'Repository ingestion failed.',
    );
  });

  it('should delegate repository discovery to the GitHub boundary', async () => {
    const create = vi.fn();
    const list = vi.fn();
    const listInstallationRepositories = vi
      .fn()
      .mockResolvedValue([
        buildInstallationRepository(),
        buildInstallationRepository({
          githubRepoId: '987654321',
          name: 'frontend',
          fullName: 'forgeops/frontend',
          isPrivate: false,
        }),
      ]);
    const service = new RepositoryService({
      repository: {
        list,
        create,
        findById: vi.fn(),
        deleteById: vi.fn(),
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
        listInstallationRepositories,
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
        listPullRequests: async () => [],
      },
    });

    await expect(service.listInstallationRepositories()).resolves.toEqual([
      buildInstallationRepository(),
      buildInstallationRepository({
        githubRepoId: '987654321',
        name: 'frontend',
        fullName: 'forgeops/frontend',
        isPrivate: false,
      }),
    ]);
    expect(listInstallationRepositories).toHaveBeenCalledTimes(1);
  });

  it('should roll back the repository when pull request sync fails after workflow run sync', async () => {
    const deleteById = vi.fn().mockResolvedValue(undefined);
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new RepositoryService({
      repository: {
        list: vi.fn(),
        create: vi.fn().mockResolvedValue(buildRepository()),
        findById: vi.fn(),
        deleteById,
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
      },
      workflowCatalogSync: {
        syncByRepositoryId: vi.fn().mockResolvedValue([]),
      },
      workflowRunSync: {
        syncByRepositoryId: vi.fn().mockResolvedValue([]),
      },
      pullRequestSync: {
        syncByRepositoryId: vi.fn().mockRejectedValue(new GitHubPullRequestSyncError()),
      },
      logger,
    });

    await expect(service.create(buildCreateInput())).rejects.toBeInstanceOf(
      GitHubPullRequestSyncError,
    );

    expect(deleteById).toHaveBeenCalledWith('repo_123');
    expect(logger.error).toHaveBeenCalledWith(
      {
        event: 'repository_ingestion_failed',
        repositoryId: 'repo_123',
        githubRepoId: '123456789',
        fullName: 'forgeops/backend',
        errorCode: 'github_pull_request_sync_unavailable',
        errorStatusCode: 503,
      },
      'Repository ingestion failed.',
    );
  });
});
