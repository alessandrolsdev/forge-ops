export type WorkflowState =
  | 'active'
  | 'deleted'
  | 'disabled_fork'
  | 'disabled_inactivity'
  | 'disabled_manually';

export type WorkflowSourceType = 'local' | 'reusable';

export interface Workflow {
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

export interface CreateWorkflowInput {
  repositoryId: string;
  githubWorkflowId: string;
  name: string;
  path: string;
  state: WorkflowState;
  sourceType: WorkflowSourceType;
}
