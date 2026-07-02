import {
  WorkflowJobAlreadyExistsError,
  WorkflowRunAlreadyExistsError,
} from './workflow-run.errors.js';
import type {
  CreateWorkflowJobInput,
  CreateWorkflowRunInput,
  WorkflowExecutionConclusion,
  WorkflowExecutionStatus,
  WorkflowJob,
  WorkflowRun,
} from './workflow-run.entity.js';
import type { WorkflowRunRepository } from './workflow-run.repository.js';

interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  githubRunId: string;
  status: WorkflowExecutionStatus;
  conclusion: WorkflowExecutionConclusion | null;
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
  status: WorkflowExecutionStatus;
  conclusion: WorkflowExecutionConclusion | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type WorkflowRunDelegate = {
  create(args: {
    data: {
      workflowId: string;
      githubRunId: string;
      status: WorkflowExecutionStatus;
      conclusion: WorkflowExecutionConclusion | null;
      branch: string;
      sha: string;
      event: string;
      startedAt: Date | null;
      finishedAt: Date | null;
      durationMs: number | null;
    };
  }): Promise<WorkflowRunRecord>;
  upsert(args: {
    where: {
      workflowId_githubRunId: {
        workflowId: string;
        githubRunId: string;
      };
    };
    create: {
      workflowId: string;
      githubRunId: string;
      status: WorkflowExecutionStatus;
      conclusion: WorkflowExecutionConclusion | null;
      branch: string;
      sha: string;
      event: string;
      startedAt: Date | null;
      finishedAt: Date | null;
      durationMs: number | null;
    };
    update: {
      status: WorkflowExecutionStatus;
      conclusion: WorkflowExecutionConclusion | null;
      branch: string;
      sha: string;
      event: string;
      startedAt: Date | null;
      finishedAt: Date | null;
      durationMs: number | null;
    };
  }): Promise<WorkflowRunRecord>;
  findMany(args: {
    where: {
      workflowId?: string;
      workflow?: {
        repositoryId: string;
      };
      status?: WorkflowExecutionStatus;
      conclusion?: {
        not: null;
      };
    };
    orderBy: Array<{
      startedAt?: 'asc' | 'desc';
      createdAt?: 'asc' | 'desc';
    }>;
    take?: number;
  }): Promise<WorkflowRunRecord[]>;
  findUnique?(args: {
    where: {
      id: string;
    };
  }): Promise<WorkflowRunRecord | null>;
};

type WorkflowJobDelegate = {
  create(args: {
    data: {
      workflowRunId: string;
      githubJobId: string;
      name: string;
      status: WorkflowExecutionStatus;
      conclusion: WorkflowExecutionConclusion | null;
      startedAt: Date | null;
      finishedAt: Date | null;
    };
  }): Promise<WorkflowJobRecord>;
  upsert(args: {
    where: {
      workflowRunId_githubJobId: {
        workflowRunId: string;
        githubJobId: string;
      };
    };
    create: {
      workflowRunId: string;
      githubJobId: string;
      name: string;
      status: WorkflowExecutionStatus;
      conclusion: WorkflowExecutionConclusion | null;
      startedAt: Date | null;
      finishedAt: Date | null;
    };
    update: {
      name: string;
      status: WorkflowExecutionStatus;
      conclusion: WorkflowExecutionConclusion | null;
      startedAt: Date | null;
      finishedAt: Date | null;
    };
  }): Promise<WorkflowJobRecord>;
  findMany(args: {
    where: {
      workflowRunId: string;
    };
    orderBy: Array<{
      startedAt?: 'asc' | 'desc';
      createdAt?: 'asc' | 'desc';
    }>;
  }): Promise<WorkflowJobRecord[]>;
};

const isUniqueConstraintError = (error: unknown): boolean => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
};

const toWorkflowRun = (record: WorkflowRunRecord): WorkflowRun => {
  return {
    id: record.id,
    workflowId: record.workflowId,
    githubRunId: record.githubRunId,
    status: record.status,
    conclusion: record.conclusion,
    branch: record.branch,
    sha: record.sha,
    event: record.event,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    durationMs: record.durationMs,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

const toWorkflowJob = (record: WorkflowJobRecord): WorkflowJob => {
  return {
    id: record.id,
    workflowRunId: record.workflowRunId,
    githubJobId: record.githubJobId,
    name: record.name,
    status: record.status,
    conclusion: record.conclusion,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export interface PrismaWorkflowRunRepositoryOptions {
  workflowRun: WorkflowRunDelegate;
  workflowJob: WorkflowJobDelegate;
}

export class PrismaWorkflowRunRepository implements WorkflowRunRepository {
  constructor(private readonly options: PrismaWorkflowRunRepositoryOptions) {}

  async createRun(input: CreateWorkflowRunInput): Promise<WorkflowRun> {
    try {
      const record = await this.options.workflowRun.create({
        data: {
          workflowId: input.workflowId,
          githubRunId: input.githubRunId,
          status: input.status,
          conclusion: input.conclusion,
          branch: input.branch,
          sha: input.sha,
          event: input.event,
          startedAt: input.startedAt,
          finishedAt: input.finishedAt,
          durationMs: input.durationMs,
        },
      });

      return toWorkflowRun(record);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new WorkflowRunAlreadyExistsError();
      }

      throw error;
    }
  }

  async upsertRun(input: CreateWorkflowRunInput): Promise<WorkflowRun> {
    const record = await this.options.workflowRun.upsert({
      where: {
        workflowId_githubRunId: {
          workflowId: input.workflowId,
          githubRunId: input.githubRunId,
        },
      },
      create: {
        workflowId: input.workflowId,
        githubRunId: input.githubRunId,
        status: input.status,
        conclusion: input.conclusion,
        branch: input.branch,
        sha: input.sha,
        event: input.event,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        durationMs: input.durationMs,
      },
      update: {
        status: input.status,
        conclusion: input.conclusion,
        branch: input.branch,
        sha: input.sha,
        event: input.event,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        durationMs: input.durationMs,
      },
    });

    return toWorkflowRun(record);
  }

  async listRunsByWorkflowId(workflowId: string): Promise<WorkflowRun[]> {
    const records = await this.options.workflowRun.findMany({
      where: {
        workflowId,
      },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map(toWorkflowRun);
  }

  async listRecentCompletedRunsByRepositoryId(
    repositoryId: string,
    limit: number,
  ): Promise<WorkflowRun[]> {
    const records = await this.options.workflowRun.findMany({
      where: {
        workflow: {
          repositoryId,
        },
        status: 'completed',
        conclusion: {
          not: null,
        },
      },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return records.map(toWorkflowRun);
  }

  async findRunById(id: string): Promise<WorkflowRun | null> {
    if (!this.options.workflowRun.findUnique) {
      return null;
    }

    const record = await this.options.workflowRun.findUnique({
      where: {
        id,
      },
    });

    return record ? toWorkflowRun(record) : null;
  }

  async createJob(input: CreateWorkflowJobInput): Promise<WorkflowJob> {
    try {
      const record = await this.options.workflowJob.create({
        data: {
          workflowRunId: input.workflowRunId,
          githubJobId: input.githubJobId,
          name: input.name,
          status: input.status,
          conclusion: input.conclusion,
          startedAt: input.startedAt,
          finishedAt: input.finishedAt,
        },
      });

      return toWorkflowJob(record);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new WorkflowJobAlreadyExistsError();
      }

      throw error;
    }
  }

  async upsertJob(input: CreateWorkflowJobInput): Promise<WorkflowJob> {
    const record = await this.options.workflowJob.upsert({
      where: {
        workflowRunId_githubJobId: {
          workflowRunId: input.workflowRunId,
          githubJobId: input.githubJobId,
        },
      },
      create: {
        workflowRunId: input.workflowRunId,
        githubJobId: input.githubJobId,
        name: input.name,
        status: input.status,
        conclusion: input.conclusion,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
      },
      update: {
        name: input.name,
        status: input.status,
        conclusion: input.conclusion,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
      },
    });

    return toWorkflowJob(record);
  }

  async listJobsByWorkflowRunId(workflowRunId: string): Promise<WorkflowJob[]> {
    const records = await this.options.workflowJob.findMany({
      where: {
        workflowRunId,
      },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map(toWorkflowJob);
  }
}
