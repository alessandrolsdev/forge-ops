import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { WorkflowRunAlreadyExistsError } from '../../../modules/workflow-runs/workflow-run.errors.js';
import { PrismaWorkflowRunRepository } from '../../../modules/workflow-runs/workflow-run.prisma-repository.js';
import type { CreateWorkflowRunInput } from '../../../modules/workflow-runs/workflow-run.entity.js';
import { createIntegrationPrismaClient, resetDatabase } from '../setup/integration-db.js';

const prisma: PrismaClient = createIntegrationPrismaClient();

const createRepository = async () => {
  return prisma.repository.create({
    data: {
      githubRepoId: '1001',
      owner: 'forgeops',
      name: 'sample-repo',
      fullName: 'forgeops/sample-repo',
      defaultBranch: 'main',
    },
  });
};

const createWorkflow = async (repositoryId: string) => {
  return prisma.workflow.create({
    data: {
      repositoryId,
      githubWorkflowId: '2001',
      name: 'CI',
      path: '.github/workflows/ci.yml',
      state: 'active',
      sourceType: 'local',
    },
  });
};

const buildRunInput = (
  workflowId: string,
  overrides: Partial<CreateWorkflowRunInput> = {},
): CreateWorkflowRunInput => {
  return {
    workflowId,
    githubRunId: '3001',
    status: 'completed',
    conclusion: 'success',
    branch: 'main',
    sha: 'abc123',
    event: 'push',
    startedAt: new Date('2026-06-01T12:00:00.000Z'),
    finishedAt: new Date('2026-06-01T12:05:00.000Z'),
    durationMs: 300000,
    ...overrides,
  };
};

describe('PrismaWorkflowRunRepository (integration)', () => {
  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await prisma.$disconnect();
  });

  it('creates and lists workflow runs against the real database', async () => {
    const repository = await createRepository();
    const workflow = await createWorkflow(repository.id);
    const repositoryUnderTest = new PrismaWorkflowRunRepository({
      workflowRun: prisma.workflowRun,
      workflowJob: prisma.workflowJob,
    });

    const created = await repositoryUnderTest.createRun(buildRunInput(workflow.id));

    expect(created.id).toBeTruthy();
    expect(created.conclusion).toBe('success');

    const runs = await repositoryUnderTest.listRunsByWorkflowId(workflow.id);

    expect(runs).toHaveLength(1);
    expect(runs[0]?.githubRunId).toBe('3001');
  });

  it('translates the unique constraint violation into WorkflowRunAlreadyExistsError', async () => {
    const repository = await createRepository();
    const workflow = await createWorkflow(repository.id);
    const repositoryUnderTest = new PrismaWorkflowRunRepository({
      workflowRun: prisma.workflowRun,
      workflowJob: prisma.workflowJob,
    });

    await repositoryUnderTest.createRun(buildRunInput(workflow.id));

    await expect(repositoryUnderTest.createRun(buildRunInput(workflow.id))).rejects.toBeInstanceOf(
      WorkflowRunAlreadyExistsError,
    );
  });

  it('upserts a run idempotently and persists runs without startedAt', async () => {
    const repository = await createRepository();
    const workflow = await createWorkflow(repository.id);
    const repositoryUnderTest = new PrismaWorkflowRunRepository({
      workflowRun: prisma.workflowRun,
      workflowJob: prisma.workflowJob,
    });

    const pendingRun = await repositoryUnderTest.upsertRun(
      buildRunInput(workflow.id, {
        status: 'queued',
        conclusion: null,
        startedAt: null,
        finishedAt: null,
        durationMs: null,
      }),
    );

    expect(pendingRun.startedAt).toBeNull();
    expect(pendingRun.conclusion).toBeNull();

    const completedRun = await repositoryUnderTest.upsertRun(buildRunInput(workflow.id));

    expect(completedRun.id).toBe(pendingRun.id);
    expect(completedRun.status).toBe('completed');
    expect(completedRun.conclusion).toBe('success');

    const runs = await repositoryUnderTest.listRunsByWorkflowId(workflow.id);

    expect(runs).toHaveLength(1);
  });

  it('lists recent completed runs by repository with limit and ordering', async () => {
    const repository = await createRepository();
    const workflow = await createWorkflow(repository.id);
    const repositoryUnderTest = new PrismaWorkflowRunRepository({
      workflowRun: prisma.workflowRun,
      workflowJob: prisma.workflowJob,
    });

    await repositoryUnderTest.createRun(
      buildRunInput(workflow.id, {
        githubRunId: 'old-success',
        startedAt: new Date('2026-06-01T10:00:00.000Z'),
      }),
    );
    await repositoryUnderTest.createRun(
      buildRunInput(workflow.id, {
        githubRunId: 'new-failure',
        conclusion: 'failure',
        startedAt: new Date('2026-06-02T10:00:00.000Z'),
      }),
    );
    await repositoryUnderTest.createRun(
      buildRunInput(workflow.id, {
        githubRunId: 'in-progress',
        status: 'in_progress',
        conclusion: null,
        startedAt: new Date('2026-06-03T10:00:00.000Z'),
      }),
    );

    const recentRuns =
      await repositoryUnderTest.listRecentCompletedRunsByRepositoryId(
        repository.id,
        1,
      );

    expect(recentRuns).toHaveLength(1);
    expect(recentRuns[0]?.githubRunId).toBe('new-failure');

    const allCompleted =
      await repositoryUnderTest.listRecentCompletedRunsByRepositoryId(
        repository.id,
        20,
      );

    expect(allCompleted.map((run) => run.githubRunId)).toEqual([
      'new-failure',
      'old-success',
    ]);
  });

  it('upserts jobs idempotently for a run', async () => {
    const repository = await createRepository();
    const workflow = await createWorkflow(repository.id);
    const repositoryUnderTest = new PrismaWorkflowRunRepository({
      workflowRun: prisma.workflowRun,
      workflowJob: prisma.workflowJob,
    });

    const run = await repositoryUnderTest.createRun(buildRunInput(workflow.id));

    const jobInput = {
      workflowRunId: run.id,
      githubJobId: '4001',
      name: 'test',
      status: 'completed' as const,
      conclusion: 'success' as const,
      startedAt: new Date('2026-06-01T12:00:30.000Z'),
      finishedAt: new Date('2026-06-01T12:04:00.000Z'),
    };

    await repositoryUnderTest.upsertJob(jobInput);
    await repositoryUnderTest.upsertJob({ ...jobInput, name: 'test (renamed)' });

    const jobs = await repositoryUnderTest.listJobsByWorkflowRunId(run.id);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.name).toBe('test (renamed)');
  });
});
