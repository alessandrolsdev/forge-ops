import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Providers } from '@/app/providers';
import type { AutomationHealthScore, ForgeOpsApiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/client';
import { AutomationHealthView } from '@/features/automation-health/automation-health-view';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const buildHealthScore = (
  overrides: Partial<AutomationHealthScore> = {},
): AutomationHealthScore => {
  return {
    repositoryId: 'repo_123',
    fullName: 'forgeops/backend',
    score: 65,
    grade: 'attention',
    signals: [
      {
        policyKey: 'ci_workflow_present',
        status: 'compliant',
        weight: 15,
        earnedPoints: 15,
        details: 'Found 2 active workflow(s).',
      },
      {
        policyKey: 'security_workflow_present',
        status: 'non_compliant',
        weight: 10,
        earnedPoints: 0,
        details: "No active workflow matching 'security', 'codeql', 'audit' or 'scan'.",
      },
    ],
    ciReliability: {
      weight: 25,
      earnedPoints: 13,
      consideredRunCount: 2,
      successfulRunCount: 1,
    },
    blockersPenalty: {
      openBlockersCount: 1,
      penaltyPoints: 3,
    },
    computedAt: '2026-07-01T12:00:00.000Z',
    ...overrides,
  };
};

const buildClient = (
  overrides: Partial<ForgeOpsApiClient> = {},
): ForgeOpsApiClient => {
  return {
    getHealth: vi.fn(),
    getRepositories: vi.fn(),
    getRepositoryDiscovery: vi.fn(),
    getRepositoryWorkflows: vi.fn(),
    getPullRequests: vi.fn(),
    getPullRequestDetail: vi.fn(),
    getWorkflowRuns: vi.fn(),
    getWorkflowRunDetail: vi.fn(),
    requestPullRequestCodexReview: vi.fn(),
    createRepository: vi.fn(),
    getAutomationHealthOverview: vi.fn(),
    getRepositoryAutomationHealth: vi.fn(),
    getRepositoryPolicyChecks: vi.fn(),
    evaluateRepositoryPolicyChecks: vi.fn(),
    getRepositoryReviewInsights: vi.fn(),
    getRepositorySyncEvents: vi.fn(),
    ...overrides,
  };
};

const renderView = (client: ForgeOpsApiClient) => {
  render(
    <Providers>
      <AutomationHealthView client={client} />
    </Providers>,
  );
};

const submitToken = () => {
  fireEvent.change(screen.getByLabelText('Operator bearer token'), {
    target: { value: 'trusted-token' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));
};

describe('AutomationHealthView', () => {
  it('should wait for an operator token before computing health scores', () => {
    const client = buildClient();

    renderView(client);

    expect(
      screen.getByText(
        'Add an operator token to compute the health score of every monitored repository.',
      ),
    ).toBeInTheDocument();
    expect(client.getAutomationHealthOverview).not.toHaveBeenCalled();
  });

  it('should render health cards with score, grade badge, and signal checklist', async () => {
    const client = buildClient({
      getAutomationHealthOverview: vi
        .fn<ForgeOpsApiClient['getAutomationHealthOverview']>()
        .mockResolvedValue([buildHealthScore()]),
      getRepositoryPolicyChecks: vi
        .fn<ForgeOpsApiClient['getRepositoryPolicyChecks']>()
        .mockResolvedValue([]),
    });

    renderView(client);
    submitToken();

    await waitFor(() => {
      expect(screen.getByText('forgeops/backend')).toBeInTheDocument();
    });

    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('Attention')).toBeInTheDocument();
    expect(screen.getByText('ci workflow present')).toBeInTheDocument();
    expect(screen.getByText('security workflow present')).toBeInTheDocument();
    expect(
      screen.getByText('CI reliability: 13/25 (1 of 2 recent runs succeeded)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('-3 pts: 1 blocker(s) open in reviewed pull requests'),
    ).toBeInTheDocument();
    expect(client.getAutomationHealthOverview).toHaveBeenCalledWith('trusted-token');
  });

  it('should surface overview errors from the backend', async () => {
    const client = buildClient({
      getAutomationHealthOverview: vi
        .fn<ForgeOpsApiClient['getAutomationHealthOverview']>()
        .mockRejectedValue(
          new ApiClientError('Authentication is required.', 401, 'authentication_required'),
        ),
    });

    renderView(client);
    submitToken();

    await waitFor(() => {
      expect(screen.getByText('Authentication is required.')).toBeInTheDocument();
    });
  });

  it('should show an empty state when no repositories are monitored', async () => {
    const client = buildClient({
      getAutomationHealthOverview: vi
        .fn<ForgeOpsApiClient['getAutomationHealthOverview']>()
        .mockResolvedValue([]),
    });

    renderView(client);
    submitToken();

    await waitFor(() => {
      expect(
        screen.getByText(
          'No repositories are monitored yet. Connect one in the Repositories page to see its health here.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('should load persisted policy checks for the selected repository', async () => {
    const client = buildClient({
      getAutomationHealthOverview: vi
        .fn<ForgeOpsApiClient['getAutomationHealthOverview']>()
        .mockResolvedValue([buildHealthScore()]),
      getRepositoryPolicyChecks: vi
        .fn<ForgeOpsApiClient['getRepositoryPolicyChecks']>()
        .mockResolvedValue([
          {
            id: 'policy_1',
            repositoryId: 'repo_123',
            policyKey: 'lint_workflow_present',
            status: 'non_compliant',
            details: "No active workflow with 'lint' in its name or path.",
            checkedAt: '2026-07-01T10:00:00.000Z',
          },
        ]),
    });

    renderView(client);
    submitToken();

    await waitFor(() => {
      expect(
        screen.getByText("No active workflow with 'lint' in its name or path."),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Non compliant')).toBeInTheDocument();
    expect(client.getRepositoryPolicyChecks).toHaveBeenCalledWith(
      'trusted-token',
      'repo_123',
    );
  });

  it('should trigger a policy evaluation and refresh the checks', async () => {
    const evaluateRepositoryPolicyChecks = vi
      .fn<ForgeOpsApiClient['evaluateRepositoryPolicyChecks']>()
      .mockResolvedValue([
        {
          id: 'policy_1',
          repositoryId: 'repo_123',
          policyKey: 'ci_workflow_present',
          status: 'compliant',
          details: 'Found 2 active workflow(s).',
          checkedAt: '2026-07-01T11:00:00.000Z',
        },
      ]);
    const client = buildClient({
      getAutomationHealthOverview: vi
        .fn<ForgeOpsApiClient['getAutomationHealthOverview']>()
        .mockResolvedValue([buildHealthScore()]),
      getRepositoryPolicyChecks: vi
        .fn<ForgeOpsApiClient['getRepositoryPolicyChecks']>()
        .mockResolvedValue([]),
      evaluateRepositoryPolicyChecks,
    });

    renderView(client);
    submitToken();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Re-evaluate policies' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Re-evaluate policies' }));

    await waitFor(() => {
      expect(screen.getByText('Policy evaluation completed.')).toBeInTheDocument();
    });

    expect(evaluateRepositoryPolicyChecks).toHaveBeenCalledWith(
      'trusted-token',
      'repo_123',
    );
  });
});
