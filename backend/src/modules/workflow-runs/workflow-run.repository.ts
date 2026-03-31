import type {
  CreateWorkflowJobInput,
  CreateWorkflowRunInput,
  WorkflowJob,
  WorkflowRun,
} from './workflow-run.entity.js';

export interface WorkflowRunRepository {
  createRun(input: CreateWorkflowRunInput): Promise<WorkflowRun>;
  upsertRun(input: CreateWorkflowRunInput): Promise<WorkflowRun>;
  listRunsByWorkflowId(workflowId: string): Promise<WorkflowRun[]>;
  createJob(input: CreateWorkflowJobInput): Promise<WorkflowJob>;
  upsertJob(input: CreateWorkflowJobInput): Promise<WorkflowJob>;
  listJobsByWorkflowRunId(workflowRunId: string): Promise<WorkflowJob[]>;
}
