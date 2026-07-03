import type { SyncEventItem } from '@/lib/api/client';

const typeLabels: Record<SyncEventItem['type'], string> = {
  repository_connected: 'Repository connected',
  workflow_catalog_sync: 'Workflow catalog sync',
  workflow_runs_sync: 'Workflow runs sync',
  pull_requests_sync: 'Pull requests sync',
  codex_review_sync: 'Codex review sync',
  policy_evaluation: 'Policy evaluation',
};

interface SyncEventsPanelProps {
  syncEvents: SyncEventItem[];
}

const formatTimestamp = (value: string): string => new Date(value).toLocaleString();

export function SyncEventsPanel({ syncEvents }: SyncEventsPanelProps) {
  if (syncEvents.length === 0) {
    return (
      <p className="empty-state">
        No sync events were recorded for this repository yet. Trigger a sync or a policy
        evaluation to start the audit trail.
      </p>
    );
  }

  return (
    <ul className="sync-events-list">
      {syncEvents.map((syncEvent) => (
        <li key={syncEvent.id} className="sync-events-list__item">
          <span
            className={
              syncEvent.status === 'succeeded'
                ? 'sync-events-list__status sync-events-list__status--succeeded'
                : 'sync-events-list__status sync-events-list__status--failed'
            }
          >
            {syncEvent.status === 'succeeded' ? 'Succeeded' : 'Failed'}
          </span>
          <div className="sync-events-list__body">
            <strong>{typeLabels[syncEvent.type]}</strong>
            <span>{syncEvent.details}</span>
            <span className="sync-events-list__timestamp">
              {formatTimestamp(syncEvent.createdAt)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
