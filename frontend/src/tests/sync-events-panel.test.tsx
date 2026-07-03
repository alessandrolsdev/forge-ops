import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SyncEventsPanel } from '@/features/repositories/components/sync-events-panel';

afterEach(() => {
  cleanup();
});

describe('SyncEventsPanel', () => {
  it('should render an empty state when there are no sync events', () => {
    render(<SyncEventsPanel syncEvents={[]} />);

    expect(
      screen.getByText(
        'No sync events were recorded for this repository yet. Trigger a sync or a policy evaluation to start the audit trail.',
      ),
    ).toBeInTheDocument();
  });

  it('should render sync events with type label, status, and details', () => {
    render(
      <SyncEventsPanel
        syncEvents={[
          {
            id: 'sync_1',
            repositoryId: 'repo_123',
            type: 'workflow_catalog_sync',
            status: 'succeeded',
            details: '2 workflow(s) sincronizado(s).',
            createdAt: '2026-07-01T08:00:00.000Z',
          },
          {
            id: 'sync_2',
            repositoryId: 'repo_123',
            type: 'pull_requests_sync',
            status: 'failed',
            details: 'Sincronizacao de pull requests falhou: Error.',
            createdAt: '2026-07-01T08:05:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Workflow catalog sync')).toBeInTheDocument();
    expect(screen.getByText('2 workflow(s) sincronizado(s).')).toBeInTheDocument();
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    expect(screen.getByText('Pull requests sync')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
