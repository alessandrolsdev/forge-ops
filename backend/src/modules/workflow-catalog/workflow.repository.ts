import type { CreateWorkflowInput, Workflow } from './workflow.entity.js';

export interface WorkflowRepository {
  create(input: CreateWorkflowInput): Promise<Workflow>;
  upsert(input: CreateWorkflowInput): Promise<Workflow>;
  listByRepositoryId(repositoryId: string): Promise<Workflow[]>;
}
