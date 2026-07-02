export type SyncEventType =
  | 'repository_connected'
  | 'workflow_catalog_sync'
  | 'workflow_runs_sync'
  | 'pull_requests_sync'
  | 'codex_review_sync'
  | 'policy_evaluation';

export type SyncEventStatus = 'succeeded' | 'failed';

export interface SyncEvent {
  id: string;
  repositoryId: string;
  type: SyncEventType;
  status: SyncEventStatus;
  details: string;
  createdAt: Date;
}

export interface CreateSyncEventInput {
  repositoryId: string;
  type: SyncEventType;
  status: SyncEventStatus;
  details: string;
}
