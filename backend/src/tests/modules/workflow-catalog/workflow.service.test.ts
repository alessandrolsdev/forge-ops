import { describe, expect, it, vi } from 'vitest';
import { GitHubWorkflowCatalogSyncError } from '../../../modules/github/github-app.errors.js';
import type { Repository } from '../../../modules/repository-registry/repository.entity.js';
import { RepositoryNotFoundError } from '../../../modules/repository-registry/repository.errors.js';
import { WorkflowService } from '../../../modules/workflow-catalog/workflow.service.js';
import type { Workflow } from '../../../modules/workflow-catalog/workflow.entity.js';

const buildRepository = (overrides: Partial<Repository> = {}): Repository => {
  const createdAt = new Date('2026-03-29T15:40:00.000Z');

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
  const createdAt = new Date('2026-03-29T15:41:00.000Z');

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

describe('WorkflowService', () => {
  it('should sync repository workflows through the GitHub boundary and workflow repository', async () => {
    const findById = vi.fn().mockResolvedValue(buildRepository());
    const listByRepositoryId = vi.fn().mockResolvedValue([
      buildWorkflow(),
      buildWorkflow({
        id: 'workflow_456',
        githubWorkflowId: 'workflow-gh-456',
        name: 'Deploy',
        path: '.github/workflows/deploy.yml',
      }),
    ]);
    const upsert = vi.fn().mockResolvedValue(buildWorkflow());
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const listRepositoryWorkflows = vi.fn().mockResolvedValue([
      {
        githubWorkflowId: 'workflow-gh-123',
        name: 'CI',
        path: '.github/workflows/ci.yml',
        state: 'active',
        sourceType: 'local',
      },
      {
        githubWorkflowId: 'workflow-gh-456',
        name: 'Deploy',
        path: '.github/workflows/deploy.yml',
        state: 'active',
        sourceType: 'local',
      },
    ]);
    const service = new WorkflowService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById,
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert,
        listByRepositoryId,
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
        listRepositoryWorkflows,
      },
      logger,
    });

    await expect(service.syncByRepositoryId('repo_123')).resolves.toEqual([
      buildWorkflow(),
      buildWorkflow({
        id: 'workflow_456',
        githubWorkflowId: 'workflow-gh-456',
        name: 'Deploy',
        path: '.github/workflows/deploy.yml',
      }),
    ]);

    expect(findById).toHaveBeenCalledWith('repo_123');
    expect(listRepositoryWorkflows).toHaveBeenCalledWith({
      owner: 'forgeops',
      name: 'backend',
    });
    expect(upsert).toHaveBeenNthCalledWith(1, {
      repositoryId: 'repo_123',
      githubWorkflowId: 'workflow-gh-123',
      name: 'CI',
      path: '.github/workflows/ci.yml',
      state: 'active',
      sourceType: 'local',
    });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      repositoryId: 'repo_123',
      githubWorkflowId: 'workflow-gh-456',
      name: 'Deploy',
      path: '.github/workflows/deploy.yml',
      state: 'active',
      sourceType: 'local',
    });
    expect(logger.info).toHaveBeenCalledWith(
      {
        event: 'workflow_catalog_sync_succeeded',
        repositoryId: 'repo_123',
        fullName: 'forgeops/backend',
        remoteWorkflowCount: 2,
        persistedWorkflowCount: 2,
      },
      'Workflow catalog sync completed.',
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should fail with repository not found when sync receives an unknown repository id', async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new WorkflowService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
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
      },
      logger,
    });

    await expect(service.syncByRepositoryId('missing_repo')).rejects.toBeInstanceOf(
      RepositoryNotFoundError,
    );
    expect(logger.error).toHaveBeenCalledWith(
      {
        event: 'workflow_catalog_sync_failed',
        repositoryId: 'missing_repo',
        errorCode: 'repository_not_found',
        errorStatusCode: 404,
      },
      'Workflow catalog sync failed.',
    );
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('should propagate a safe GitHub workflow catalog error during sync', async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new WorkflowService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
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
        listRepositoryWorkflows: async () => {
          throw new GitHubWorkflowCatalogSyncError();
        },
      },
      logger,
    });

    await expect(service.syncByRepositoryId('repo_123')).rejects.toBeInstanceOf(
      GitHubWorkflowCatalogSyncError,
    );
    expect(logger.error).toHaveBeenCalledWith(
      {
        event: 'workflow_catalog_sync_failed',
        repositoryId: 'repo_123',
        fullName: 'forgeops/backend',
        errorCode: 'github_workflow_catalog_unavailable',
        errorStatusCode: 503,
      },
      'Workflow catalog sync failed.',
    );
    expect(logger.info).not.toHaveBeenCalled();
  });
});
