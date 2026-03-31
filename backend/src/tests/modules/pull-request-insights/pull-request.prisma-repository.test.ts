import { describe, expect, it, vi } from 'vitest';
import { PullRequestAlreadyExistsError } from '../../../modules/pull-request-insights/pull-request.errors.js';
import { PrismaPullRequestRepository } from '../../../modules/pull-request-insights/pull-request.prisma-repository.js';

interface PullRequestRecord {
  id: string;
  repositoryId: string;
  githubPrId: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  baseBranch: string;
  headBranch: string;
  createdAt: Date;
  updatedAt: Date;
}

const buildRecord = (
  overrides: Partial<PullRequestRecord> = {},
): PullRequestRecord => {
  const createdAt = new Date('2026-03-31T16:00:00.000Z');

  return {
    id: 'pr_123',
    repositoryId: 'repo_123',
    githubPrId: '987654321',
    number: 42,
    title: 'Add workflow dashboard',
    state: 'open',
    author: 'alessandrolsdev',
    baseBranch: 'main',
    headBranch: 'feature/workflow-dashboard',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

describe('PrismaPullRequestRepository', () => {
  it('should create and map a pull request record', async () => {
    const create = vi.fn().mockResolvedValue(buildRecord());
    const upsert = vi.fn();
    const findMany = vi.fn();
    const findUnique = vi.fn();
    const repository = new PrismaPullRequestRepository({
      create,
      upsert,
      findMany,
      findUnique,
    });

    await expect(
      repository.create({
        repositoryId: 'repo_123',
        githubPrId: '987654321',
        number: 42,
        title: 'Add workflow dashboard',
        state: 'open',
        author: 'alessandrolsdev',
        baseBranch: 'main',
        headBranch: 'feature/workflow-dashboard',
      }),
    ).resolves.toEqual(buildRecord());

    expect(create).toHaveBeenCalledWith({
      data: {
        repositoryId: 'repo_123',
        githubPrId: '987654321',
        number: 42,
        title: 'Add workflow dashboard',
        state: 'open',
        author: 'alessandrolsdev',
        baseBranch: 'main',
        headBranch: 'feature/workflow-dashboard',
      },
    });
  });

  it('should list pull requests by repository ordered by newest first', async () => {
    const create = vi.fn();
    const upsert = vi.fn();
    const findUnique = vi.fn();
    const findMany = vi.fn().mockResolvedValue([
      buildRecord({
        id: 'pr_2',
        githubPrId: '2',
        number: 43,
        title: 'Fix flaky tests',
      }),
      buildRecord({
        id: 'pr_1',
        githubPrId: '1',
      }),
    ]);
    const repository = new PrismaPullRequestRepository({
      create,
      upsert,
      findMany,
      findUnique,
    });

    await expect(repository.listByRepositoryId('repo_123')).resolves.toEqual([
      buildRecord({
        id: 'pr_2',
        githubPrId: '2',
        number: 43,
        title: 'Fix flaky tests',
      }),
      buildRecord({
        id: 'pr_1',
        githubPrId: '1',
      }),
    ]);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        repositoryId: 'repo_123',
      },
      orderBy: [{ number: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('should find a pull request by id', async () => {
    const create = vi.fn();
    const upsert = vi.fn();
    const findMany = vi.fn();
    const findUnique = vi.fn().mockResolvedValue(buildRecord());
    const repository = new PrismaPullRequestRepository({
      create,
      upsert,
      findMany,
      findUnique,
    });

    await expect(repository.findById('pr_123')).resolves.toEqual(buildRecord());

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        id: 'pr_123',
      },
    });
  });

  it('should translate unique constraint errors into a domain conflict', async () => {
    const create = vi.fn().mockRejectedValue({ code: 'P2002' });
    const upsert = vi.fn();
    const findMany = vi.fn();
    const findUnique = vi.fn();
    const repository = new PrismaPullRequestRepository({
      create,
      upsert,
      findMany,
      findUnique,
    });

    await expect(
      repository.create({
        repositoryId: 'repo_123',
        githubPrId: '987654321',
        number: 42,
        title: 'Add workflow dashboard',
        state: 'open',
        author: 'alessandrolsdev',
        baseBranch: 'main',
        headBranch: 'feature/workflow-dashboard',
      }),
    ).rejects.toBeInstanceOf(PullRequestAlreadyExistsError);
  });

  it('should upsert pull requests by repository and GitHub pull request id', async () => {
    const create = vi.fn();
    const upsert = vi.fn().mockResolvedValue(
      buildRecord({
        state: 'merged',
      }),
    );
    const findMany = vi.fn();
    const findUnique = vi.fn();
    const repository = new PrismaPullRequestRepository({
      create,
      upsert,
      findMany,
      findUnique,
    });

    await expect(
      repository.upsert({
        repositoryId: 'repo_123',
        githubPrId: '987654321',
        number: 42,
        title: 'Add workflow dashboard',
        state: 'merged',
        author: 'alessandrolsdev',
        baseBranch: 'main',
        headBranch: 'feature/workflow-dashboard',
      }),
    ).resolves.toEqual(
      buildRecord({
        state: 'merged',
      }),
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        repositoryId_githubPrId: {
          repositoryId: 'repo_123',
          githubPrId: '987654321',
        },
      },
      create: {
        repositoryId: 'repo_123',
        githubPrId: '987654321',
        number: 42,
        title: 'Add workflow dashboard',
        state: 'merged',
        author: 'alessandrolsdev',
        baseBranch: 'main',
        headBranch: 'feature/workflow-dashboard',
      },
      update: {
        number: 42,
        title: 'Add workflow dashboard',
        state: 'merged',
        author: 'alessandrolsdev',
        baseBranch: 'main',
        headBranch: 'feature/workflow-dashboard',
      },
    });
  });
});
