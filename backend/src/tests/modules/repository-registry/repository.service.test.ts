import { describe, expect, it, vi } from 'vitest';
import type {
  CreateRepositoryInput,
  Repository,
} from '../../../modules/repository-registry/repository.entity.js';
import type { GitHubInstallationRepository } from '../../../modules/github/github-app.boundary.js';
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
    const service = new RepositoryService({
      repository: {
        list,
        create,
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
      },
    });

    await expect(service.create(buildCreateInput())).resolves.toEqual(buildRepository());
    expect(create).toHaveBeenCalledWith(buildCreateInput());
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
});
