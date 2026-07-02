import { describe, expect, it, vi } from 'vitest';
import {
  WorkflowJobAlreadyExistsError,
  WorkflowRunAlreadyExistsError,
} from '../../../modules/workflow-runs/workflow-run.errors.js';
import { PrismaWorkflowRunRepository } from '../../../modules/workflow-runs/workflow-run.prisma-repository.js';

interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  githubRunId: string;
  status:
    | 'queued'
    | 'in_progress'
    | 'completed'
    | 'pending'
    | 'waiting'
    | 'requested';
  conclusion:
    | 'success'
    | 'failure'
    | 'neutral'
    | 'cancelled'
    | 'skipped'
    | 'timed_out'
    | 'action_required'
    | 'stale'
    | 'startup_failure'
    | null;
  branch: string;
  sha: string;
  event: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowJobRecord {
  id: string;
  workflowRunId: string;
  githubJobId: string;
  name: string;
  status:
    | 'queued'
    | 'in_progress'
    | 'completed'
    | 'pending'
    | 'waiting'
    | 'requested';
  conclusion:
    | 'success'
    | 'failure'
    | 'neutral'
    | 'cancelled'
    | 'skipped'
    | 'timed_out'
    | 'action_required'
    | 'stale'
    | 'startup_failure'
    | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const buildRunRecord = (
  overrides: Partial<WorkflowRunRecord> = {},
): WorkflowRunRecord => {
  const startedAt = new Date('2026-03-30T12:00:00.000Z');

  return {
    id: 'run_123',
    workflowId: 'workflow_123',
    githubRunId: '987654321',
    status: 'completed',
    conclusion: 'success',
    branch: 'main',
    sha: 'abc123def456',
    event: 'push',
    startedAt,
    finishedAt: new Date('2026-03-30T12:05:00.000Z'),
    durationMs: 300000,
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
};

const buildJobRecord = (
  overrides: Partial<WorkflowJobRecord> = {},
): WorkflowJobRecord => {
  const startedAt = new Date('2026-03-30T12:01:00.000Z');

  return {
    id: 'job_123',
    workflowRunId: 'run_123',
    githubJobId: '123456789',
    name: 'lint',
    status: 'completed',
    conclusion: 'success',
    startedAt,
    finishedAt: new Date('2026-03-30T12:02:00.000Z'),
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
};

describe('PrismaWorkflowRunRepository', () => {
  it('should create and map a workflow run record', async () => {
    const workflowRunCreate = vi.fn().mockResolvedValue(buildRunRecord());
    const workflowRunUpsert = vi.fn();
    const workflowRunFindMany = vi.fn();
    const workflowJobCreate = vi.fn();
    const workflowJobUpsert = vi.fn();
    const workflowJobFindMany = vi.fn();
    const repository = new PrismaWorkflowRunRepository({
      workflowRun: {
        create: workflowRunCreate,
        upsert: workflowRunUpsert,
        findMany: workflowRunFindMany,
      },
      workflowJob: {
        create: workflowJobCreate,
        upsert: workflowJobUpsert,
        findMany: workflowJobFindMany,
      },
    });

    await expect(
      repository.createRun({
        workflowId: 'workflow_123',
        githubRunId: '987654321',
        status: 'completed',
        conclusion: 'success',
        branch: 'main',
        sha: 'abc123def456',
        event: 'push',
        startedAt: new Date('2026-03-30T12:00:00.000Z'),
        finishedAt: new Date('2026-03-30T12:05:00.000Z'),
        durationMs: 300000,
      }),
    ).resolves.toEqual(buildRunRecord());

    expect(workflowRunCreate).toHaveBeenCalledWith({
      data: {
        workflowId: 'workflow_123',
        githubRunId: '987654321',
        status: 'completed',
        conclusion: 'success',
        branch: 'main',
        sha: 'abc123def456',
        event: 'push',
        startedAt: new Date('2026-03-30T12:00:00.000Z'),
        finishedAt: new Date('2026-03-30T12:05:00.000Z'),
        durationMs: 300000,
      },
    });
  });

  it('should list workflow runs by workflow ordered by newest startedAt first', async () => {
    const workflowRunCreate = vi.fn();
    const workflowRunUpsert = vi.fn();
    const workflowRunFindMany = vi.fn().mockResolvedValue([
      buildRunRecord({
        id: 'run_2',
        githubRunId: '2',
        startedAt: new Date('2026-03-30T12:10:00.000Z'),
      }),
      buildRunRecord({
        id: 'run_1',
        githubRunId: '1',
        startedAt: new Date('2026-03-30T12:00:00.000Z'),
      }),
    ]);
    const workflowJobCreate = vi.fn();
    const workflowJobUpsert = vi.fn();
    const workflowJobFindMany = vi.fn();
    const repository = new PrismaWorkflowRunRepository({
      workflowRun: {
        create: workflowRunCreate,
        upsert: workflowRunUpsert,
        findMany: workflowRunFindMany,
      },
      workflowJob: {
        create: workflowJobCreate,
        upsert: workflowJobUpsert,
        findMany: workflowJobFindMany,
      },
    });

    await expect(repository.listRunsByWorkflowId('workflow_123')).resolves.toEqual([
      buildRunRecord({
        id: 'run_2',
        githubRunId: '2',
        startedAt: new Date('2026-03-30T12:10:00.000Z'),
      }),
      buildRunRecord({
        id: 'run_1',
        githubRunId: '1',
        startedAt: new Date('2026-03-30T12:00:00.000Z'),
      }),
    ]);

    expect(workflowRunFindMany).toHaveBeenCalledWith({
      where: {
        workflowId: 'workflow_123',
      },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('should list recent completed runs by repository with a sample limit', async () => {
    const workflowRunCreate = vi.fn();
    const workflowRunUpsert = vi.fn();
    const workflowRunFindMany = vi.fn().mockResolvedValue([buildRunRecord()]);
    const repository = new PrismaWorkflowRunRepository({
      workflowRun: {
        create: workflowRunCreate,
        upsert: workflowRunUpsert,
        findMany: workflowRunFindMany,
      },
      workflowJob: {
        create: vi.fn(),
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
    });

    await expect(
      repository.listRecentCompletedRunsByRepositoryId('repo_123', 20),
    ).resolves.toEqual([buildRunRecord()]);

    expect(workflowRunFindMany).toHaveBeenCalledWith({
      where: {
        workflow: {
          repositoryId: 'repo_123',
        },
        status: 'completed',
        conclusion: {
          not: null,
        },
      },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });
  });

  it('should find a workflow run by id', async () => {
    const workflowRunCreate = vi.fn();
    const workflowRunUpsert = vi.fn();
    const workflowRunFindMany = vi.fn();
    const workflowRunFindUnique = vi.fn().mockResolvedValue(buildRunRecord());
    const workflowJobCreate = vi.fn();
    const workflowJobUpsert = vi.fn();
    const workflowJobFindMany = vi.fn();
    const repository = new PrismaWorkflowRunRepository({
      workflowRun: {
        create: workflowRunCreate,
        upsert: workflowRunUpsert,
        findMany: workflowRunFindMany,
        findUnique: workflowRunFindUnique,
      },
      workflowJob: {
        create: workflowJobCreate,
        upsert: workflowJobUpsert,
        findMany: workflowJobFindMany,
      },
    });

    await expect(repository.findRunById('run_123')).resolves.toEqual(
      buildRunRecord(),
    );

    expect(workflowRunFindUnique).toHaveBeenCalledWith({
      where: {
        id: 'run_123',
      },
    });
  });

  it('should translate unique constraint errors into a run domain conflict', async () => {
    const workflowRunCreate = vi.fn().mockRejectedValue({ code: 'P2002' });
    const workflowRunUpsert = vi.fn();
    const workflowRunFindMany = vi.fn();
    const workflowJobCreate = vi.fn();
    const workflowJobUpsert = vi.fn();
    const workflowJobFindMany = vi.fn();
    const repository = new PrismaWorkflowRunRepository({
      workflowRun: {
        create: workflowRunCreate,
        upsert: workflowRunUpsert,
        findMany: workflowRunFindMany,
      },
      workflowJob: {
        create: workflowJobCreate,
        upsert: workflowJobUpsert,
        findMany: workflowJobFindMany,
      },
    });

    await expect(
      repository.createRun({
        workflowId: 'workflow_123',
        githubRunId: '987654321',
        status: 'completed',
        conclusion: 'success',
        branch: 'main',
        sha: 'abc123def456',
        event: 'push',
        startedAt: new Date('2026-03-30T12:00:00.000Z'),
        finishedAt: new Date('2026-03-30T12:05:00.000Z'),
        durationMs: 300000,
      }),
    ).rejects.toBeInstanceOf(WorkflowRunAlreadyExistsError);
  });

  it('should upsert workflow runs by workflow and GitHub run id', async () => {
    const workflowRunCreate = vi.fn();
    const workflowRunUpsert = vi.fn().mockResolvedValue(
      buildRunRecord({ status: 'in_progress', conclusion: null }),
    );
    const workflowRunFindMany = vi.fn();
    const workflowJobCreate = vi.fn();
    const workflowJobUpsert = vi.fn();
    const workflowJobFindMany = vi.fn();
    const repository = new PrismaWorkflowRunRepository({
      workflowRun: {
        create: workflowRunCreate,
        upsert: workflowRunUpsert,
        findMany: workflowRunFindMany,
      },
      workflowJob: {
        create: workflowJobCreate,
        upsert: workflowJobUpsert,
        findMany: workflowJobFindMany,
      },
    });

    await expect(
      repository.upsertRun({
        workflowId: 'workflow_123',
        githubRunId: '987654321',
        status: 'in_progress',
        conclusion: null,
        branch: 'main',
        sha: 'abc123def456',
        event: 'push',
        startedAt: new Date('2026-03-30T12:00:00.000Z'),
        finishedAt: null,
        durationMs: null,
      }),
    ).resolves.toEqual(buildRunRecord({ status: 'in_progress', conclusion: null }));

    expect(workflowRunUpsert).toHaveBeenCalledWith({
      where: {
        workflowId_githubRunId: {
          workflowId: 'workflow_123',
          githubRunId: '987654321',
        },
      },
      create: {
        workflowId: 'workflow_123',
        githubRunId: '987654321',
        status: 'in_progress',
        conclusion: null,
        branch: 'main',
        sha: 'abc123def456',
        event: 'push',
        startedAt: new Date('2026-03-30T12:00:00.000Z'),
        finishedAt: null,
        durationMs: null,
      },
      update: {
        status: 'in_progress',
        conclusion: null,
        branch: 'main',
        sha: 'abc123def456',
        event: 'push',
        startedAt: new Date('2026-03-30T12:00:00.000Z'),
        finishedAt: null,
        durationMs: null,
      },
    });
  });

  it('should create and map a workflow job record', async () => {
    const workflowRunCreate = vi.fn();
    const workflowRunUpsert = vi.fn();
    const workflowRunFindMany = vi.fn();
    const workflowJobCreate = vi.fn().mockResolvedValue(buildJobRecord());
    const workflowJobUpsert = vi.fn();
    const workflowJobFindMany = vi.fn();
    const repository = new PrismaWorkflowRunRepository({
      workflowRun: {
        create: workflowRunCreate,
        upsert: workflowRunUpsert,
        findMany: workflowRunFindMany,
      },
      workflowJob: {
        create: workflowJobCreate,
        upsert: workflowJobUpsert,
        findMany: workflowJobFindMany,
      },
    });

    await expect(
      repository.createJob({
        workflowRunId: 'run_123',
        githubJobId: '123456789',
        name: 'lint',
        status: 'completed',
        conclusion: 'success',
        startedAt: new Date('2026-03-30T12:01:00.000Z'),
        finishedAt: new Date('2026-03-30T12:02:00.000Z'),
      }),
    ).resolves.toEqual(buildJobRecord());

    expect(workflowJobCreate).toHaveBeenCalledWith({
      data: {
        workflowRunId: 'run_123',
        githubJobId: '123456789',
        name: 'lint',
        status: 'completed',
        conclusion: 'success',
        startedAt: new Date('2026-03-30T12:01:00.000Z'),
        finishedAt: new Date('2026-03-30T12:02:00.000Z'),
      },
    });
  });

  it('should list workflow jobs by run ordered by newest startedAt first', async () => {
    const workflowRunCreate = vi.fn();
    const workflowRunUpsert = vi.fn();
    const workflowRunFindMany = vi.fn();
    const workflowJobCreate = vi.fn();
    const workflowJobUpsert = vi.fn();
    const workflowJobFindMany = vi.fn().mockResolvedValue([
      buildJobRecord({
        id: 'job_2',
        githubJobId: '2',
        name: 'test',
        startedAt: new Date('2026-03-30T12:03:00.000Z'),
      }),
      buildJobRecord({
        id: 'job_1',
        githubJobId: '1',
        name: 'lint',
        startedAt: new Date('2026-03-30T12:01:00.000Z'),
      }),
    ]);
    const repository = new PrismaWorkflowRunRepository({
      workflowRun: {
        create: workflowRunCreate,
        upsert: workflowRunUpsert,
        findMany: workflowRunFindMany,
      },
      workflowJob: {
        create: workflowJobCreate,
        upsert: workflowJobUpsert,
        findMany: workflowJobFindMany,
      },
    });

    await expect(repository.listJobsByWorkflowRunId('run_123')).resolves.toEqual([
      buildJobRecord({
        id: 'job_2',
        githubJobId: '2',
        name: 'test',
        startedAt: new Date('2026-03-30T12:03:00.000Z'),
      }),
      buildJobRecord({
        id: 'job_1',
        githubJobId: '1',
        name: 'lint',
        startedAt: new Date('2026-03-30T12:01:00.000Z'),
      }),
    ]);

    expect(workflowJobFindMany).toHaveBeenCalledWith({
      where: {
        workflowRunId: 'run_123',
      },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('should translate unique constraint errors into a job domain conflict', async () => {
    const workflowRunCreate = vi.fn();
    const workflowRunUpsert = vi.fn();
    const workflowRunFindMany = vi.fn();
    const workflowJobCreate = vi.fn().mockRejectedValue({ code: 'P2002' });
    const workflowJobUpsert = vi.fn();
    const workflowJobFindMany = vi.fn();
    const repository = new PrismaWorkflowRunRepository({
      workflowRun: {
        create: workflowRunCreate,
        upsert: workflowRunUpsert,
        findMany: workflowRunFindMany,
      },
      workflowJob: {
        create: workflowJobCreate,
        upsert: workflowJobUpsert,
        findMany: workflowJobFindMany,
      },
    });

    await expect(
      repository.createJob({
        workflowRunId: 'run_123',
        githubJobId: '123456789',
        name: 'lint',
        status: 'completed',
        conclusion: 'success',
        startedAt: new Date('2026-03-30T12:01:00.000Z'),
        finishedAt: new Date('2026-03-30T12:02:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(WorkflowJobAlreadyExistsError);
  });

  it('should upsert jobs by run and GitHub job id', async () => {
    const workflowRunCreate = vi.fn();
    const workflowRunUpsert = vi.fn();
    const workflowRunFindMany = vi.fn();
    const workflowJobCreate = vi.fn();
    const workflowJobUpsert = vi.fn().mockResolvedValue(
      buildJobRecord({ status: 'in_progress', conclusion: null }),
    );
    const workflowJobFindMany = vi.fn();
    const repository = new PrismaWorkflowRunRepository({
      workflowRun: {
        create: workflowRunCreate,
        upsert: workflowRunUpsert,
        findMany: workflowRunFindMany,
      },
      workflowJob: {
        create: workflowJobCreate,
        upsert: workflowJobUpsert,
        findMany: workflowJobFindMany,
      },
    });

    await expect(
      repository.upsertJob({
        workflowRunId: 'run_123',
        githubJobId: '123456789',
        name: 'lint',
        status: 'in_progress',
        conclusion: null,
        startedAt: new Date('2026-03-30T12:01:00.000Z'),
        finishedAt: null,
      }),
    ).resolves.toEqual(buildJobRecord({ status: 'in_progress', conclusion: null }));

    expect(workflowJobUpsert).toHaveBeenCalledWith({
      where: {
        workflowRunId_githubJobId: {
          workflowRunId: 'run_123',
          githubJobId: '123456789',
        },
      },
      create: {
        workflowRunId: 'run_123',
        githubJobId: '123456789',
        name: 'lint',
        status: 'in_progress',
        conclusion: null,
        startedAt: new Date('2026-03-30T12:01:00.000Z'),
        finishedAt: null,
      },
      update: {
        name: 'lint',
        status: 'in_progress',
        conclusion: null,
        startedAt: new Date('2026-03-30T12:01:00.000Z'),
        finishedAt: null,
      },
    });
  });
});
