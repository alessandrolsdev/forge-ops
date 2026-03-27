import { describe, expect, it, vi } from 'vitest';
import {
  PrismaRepositoryRepository,
} from '../../../modules/repository-registry/repository.prisma-repository.js';
import { RepositoryAlreadyExistsError } from '../../../modules/repository-registry/repository.errors.js';

interface RepositoryRecord {
  id: string;
  githubRepoId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const buildRecord = (
  overrides: Partial<RepositoryRecord> = {},
): RepositoryRecord => {
  const createdAt = new Date('2026-03-27T16:20:00.000Z');

  return {
    id: 'repo_123',
    githubRepoId: '987654321',
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

describe('PrismaRepositoryRepository', () => {
  it('should create and map a repository record', async () => {
    const create = vi.fn().mockResolvedValue(buildRecord());
    const findMany = vi.fn();
    const repository = new PrismaRepositoryRepository({
      create,
      findMany,
    });

    await expect(
      repository.create({
        githubRepoId: '987654321',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
      }),
    ).resolves.toEqual(buildRecord());

    expect(create).toHaveBeenCalledWith({
      data: {
        githubRepoId: '987654321',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
        isActive: true,
      },
    });
  });

  it('should list repositories ordered by newest first', async () => {
    const create = vi.fn();
    const findMany = vi.fn().mockResolvedValue([
      buildRecord({ id: 'repo_b', fullName: 'forgeops/b', name: 'b' }),
      buildRecord({ id: 'repo_a', fullName: 'forgeops/a', name: 'a' }),
    ]);
    const repository = new PrismaRepositoryRepository({
      create,
      findMany,
    });

    await expect(repository.list()).resolves.toEqual([
      buildRecord({ id: 'repo_b', fullName: 'forgeops/b', name: 'b' }),
      buildRecord({ id: 'repo_a', fullName: 'forgeops/a', name: 'a' }),
    ]);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('should translate unique constraint errors into a domain conflict', async () => {
    const create = vi.fn().mockRejectedValue({ code: 'P2002' });
    const findMany = vi.fn();
    const repository = new PrismaRepositoryRepository({
      create,
      findMany,
    });

    await expect(
      repository.create({
        githubRepoId: '987654321',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
      }),
    ).rejects.toBeInstanceOf(RepositoryAlreadyExistsError);
  });
});
