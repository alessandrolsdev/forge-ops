import { describe, expect, it, vi } from 'vitest';
import type {
  CreateRepositoryInput,
  Repository,
} from '../../../modules/repository-registry/repository.entity.js';
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
    });

    await expect(service.create(buildCreateInput())).resolves.toEqual(buildRepository());
    expect(create).toHaveBeenCalledWith(buildCreateInput());
  });
});
