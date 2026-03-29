import { describe, expect, it, vi } from 'vitest';
import { WorkflowAlreadyExistsError } from '../../../modules/workflow-catalog/workflow.errors.js';
import { PrismaWorkflowRepository } from '../../../modules/workflow-catalog/workflow.prisma-repository.js';

interface WorkflowRecord {
  id: string;
  repositoryId: string;
  githubWorkflowId: string;
  name: string;
  path: string;
  state:
    | 'active'
    | 'deleted'
    | 'disabled_fork'
    | 'disabled_inactivity'
    | 'disabled_manually';
  sourceType: 'local' | 'reusable';
  createdAt: Date;
  updatedAt: Date;
}

const buildRecord = (overrides: Partial<WorkflowRecord> = {}): WorkflowRecord => {
  const createdAt = new Date('2026-03-29T15:10:00.000Z');

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

describe('PrismaWorkflowRepository', () => {
  it('should create and map a workflow record', async () => {
    const create = vi.fn().mockResolvedValue(buildRecord());
    const findMany = vi.fn();
    const upsert = vi.fn();
    const repository = new PrismaWorkflowRepository({
      create,
      upsert,
      findMany,
    });

    await expect(
      repository.create({
        repositoryId: 'repo_123',
        githubWorkflowId: 'workflow-gh-123',
        name: 'CI',
        path: '.github/workflows/ci.yml',
        state: 'active',
        sourceType: 'local',
      }),
    ).resolves.toEqual(buildRecord());

    expect(create).toHaveBeenCalledWith({
      data: {
        repositoryId: 'repo_123',
        githubWorkflowId: 'workflow-gh-123',
        name: 'CI',
        path: '.github/workflows/ci.yml',
        state: 'active',
        sourceType: 'local',
      },
    });
  });

  it('should list workflows by repository ordered by newest first', async () => {
    const create = vi.fn();
    const upsert = vi.fn();
    const findMany = vi.fn().mockResolvedValue([
      buildRecord({
        id: 'workflow_2',
        githubWorkflowId: 'workflow-gh-2',
        name: 'Deploy',
        path: '.github/workflows/deploy.yml',
        sourceType: 'reusable',
      }),
      buildRecord({
        id: 'workflow_1',
        githubWorkflowId: 'workflow-gh-1',
      }),
    ]);
    const repository = new PrismaWorkflowRepository({
      create,
      upsert,
      findMany,
    });

    await expect(repository.listByRepositoryId('repo_123')).resolves.toEqual([
      buildRecord({
        id: 'workflow_2',
        githubWorkflowId: 'workflow-gh-2',
        name: 'Deploy',
        path: '.github/workflows/deploy.yml',
        sourceType: 'reusable',
      }),
      buildRecord({
        id: 'workflow_1',
        githubWorkflowId: 'workflow-gh-1',
      }),
    ]);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        repositoryId: 'repo_123',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('should translate unique constraint errors into a domain conflict', async () => {
    const create = vi.fn().mockRejectedValue({ code: 'P2002' });
    const findMany = vi.fn();
    const upsert = vi.fn();
    const repository = new PrismaWorkflowRepository({
      create,
      upsert,
      findMany,
    });

    await expect(
      repository.create({
        repositoryId: 'repo_123',
        githubWorkflowId: 'workflow-gh-123',
        name: 'CI',
        path: '.github/workflows/ci.yml',
        state: 'active',
        sourceType: 'local',
      }),
    ).rejects.toBeInstanceOf(WorkflowAlreadyExistsError);
  });

  it('should upsert workflow catalog entries by repository and GitHub workflow id', async () => {
    const create = vi.fn();
    const upsert = vi.fn().mockResolvedValue(buildRecord({ name: 'Deploy' }));
    const findMany = vi.fn();
    const repository = new PrismaWorkflowRepository({
      create,
      upsert,
      findMany,
    });

    await expect(
      repository.upsert({
        repositoryId: 'repo_123',
        githubWorkflowId: 'workflow-gh-123',
        name: 'Deploy',
        path: '.github/workflows/deploy.yml',
        state: 'active',
        sourceType: 'local',
      }),
    ).resolves.toEqual(buildRecord({ name: 'Deploy' }));

    expect(upsert).toHaveBeenCalledWith({
      where: {
        repositoryId_githubWorkflowId: {
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
        },
      },
      create: {
        repositoryId: 'repo_123',
        githubWorkflowId: 'workflow-gh-123',
        name: 'Deploy',
        path: '.github/workflows/deploy.yml',
        state: 'active',
        sourceType: 'local',
      },
      update: {
        name: 'Deploy',
        path: '.github/workflows/deploy.yml',
        state: 'active',
        sourceType: 'local',
      },
    });
  });
});
