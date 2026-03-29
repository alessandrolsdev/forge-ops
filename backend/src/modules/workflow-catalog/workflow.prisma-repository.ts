import { WorkflowAlreadyExistsError } from './workflow.errors.js';
import type {
  CreateWorkflowInput,
  Workflow,
  WorkflowSourceType,
  WorkflowState,
} from './workflow.entity.js';
import type { WorkflowRepository } from './workflow.repository.js';

interface WorkflowRecord {
  id: string;
  repositoryId: string;
  githubWorkflowId: string;
  name: string;
  path: string;
  state: WorkflowState;
  sourceType: WorkflowSourceType;
  createdAt: Date;
  updatedAt: Date;
}

type WorkflowDelegate = {
  create(args: {
    data: {
      repositoryId: string;
      githubWorkflowId: string;
      name: string;
      path: string;
      state: WorkflowState;
      sourceType: WorkflowSourceType;
    };
  }): Promise<WorkflowRecord>;
  findMany(args: {
    where: {
      repositoryId: string;
    };
    orderBy: {
      createdAt: 'asc' | 'desc';
    };
  }): Promise<WorkflowRecord[]>;
};

const isUniqueConstraintError = (error: unknown): boolean => {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
};

const toWorkflow = (record: WorkflowRecord): Workflow => {
  return {
    id: record.id,
    repositoryId: record.repositoryId,
    githubWorkflowId: record.githubWorkflowId,
    name: record.name,
    path: record.path,
    state: record.state,
    sourceType: record.sourceType,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export class PrismaWorkflowRepository implements WorkflowRepository {
  constructor(private readonly workflow: WorkflowDelegate) {}

  async create(input: CreateWorkflowInput): Promise<Workflow> {
    try {
      const record = await this.workflow.create({
        data: {
          repositoryId: input.repositoryId,
          githubWorkflowId: input.githubWorkflowId,
          name: input.name,
          path: input.path,
          state: input.state,
          sourceType: input.sourceType,
        },
      });

      return toWorkflow(record);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new WorkflowAlreadyExistsError();
      }

      throw error;
    }
  }

  async listByRepositoryId(repositoryId: string): Promise<Workflow[]> {
    const records = await this.workflow.findMany({
      where: {
        repositoryId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records.map(toWorkflow);
  }
}
