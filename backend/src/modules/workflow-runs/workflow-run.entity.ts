export type WorkflowExecutionStatus =
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'pending'
  | 'waiting'
  | 'requested';

export type WorkflowExecutionConclusion =
  | 'success'
  | 'failure'
  | 'neutral'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | 'stale'
  | 'startup_failure';

export interface WorkflowRun {
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

export interface WorkflowJob {
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

export interface CreateWorkflowRunInput {
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
}

export interface CreateWorkflowJobInput {
  workflowRunId: string;
  githubJobId: string;
  name: string;
  status: WorkflowExecutionStatus;
  conclusion: WorkflowExecutionConclusion | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}
