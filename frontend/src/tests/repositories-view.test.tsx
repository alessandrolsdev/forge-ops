import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Providers } from '@/app/providers';
import type { ForgeOpsApiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/client';
import { RepositoriesView } from '@/features/repositories/repositories-view';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const renderRepositoriesView = (client: ForgeOpsApiClient) => {
  render(
    <Providers>
      <RepositoriesView client={client} />
    </Providers>,
  );
};

describe('RepositoriesView', () => {
  it('should wait for an operator token before querying protected repository APIs', () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn(),
      getRepositoryDiscovery: vi.fn(),
      getRepositoryWorkflows: vi.fn(),
      getPullRequests: vi.fn(),
      getPullRequestDetail: vi.fn().mockResolvedValue({
        id: 'pr_123',
        number: 42,
        title: 'Add pull request insights',
        status: 'open',
        author: 'alessandrolsdev',
        summary: null,
        workflows: [],
      }),
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
    };

    renderRepositoriesView(client);

    expect(
      screen.getByText(
        'Add an operator token to load the repositories already monitored by ForgeOps.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Add an operator token to query repository discovery through the backend.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Add an operator token to inspect pull requests for monitored repositories.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Add an operator token to inspect workflow catalogs for monitored repositories.',
      ),
    ).toBeInTheDocument();
    expect(client.getRepositories).not.toHaveBeenCalled();
    expect(client.getRepositoryDiscovery).not.toHaveBeenCalled();
    expect(client.getRepositoryWorkflows).not.toHaveBeenCalled();
    expect(client.getPullRequests).not.toHaveBeenCalled();
    expect(client.getPullRequestDetail).not.toHaveBeenCalled();
    expect(client.getWorkflowRuns).not.toHaveBeenCalled();
  });

  it('should load repository workflows for the selected monitored repository', async () => {
    const getRepositories = vi
      .fn<ForgeOpsApiClient['getRepositories']>()
      .mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]);
    const getRepositoryDiscovery = vi
      .fn<ForgeOpsApiClient['getRepositoryDiscovery']>()
      .mockResolvedValue([
        {
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isPrivate: true,
        },
      ]);
    const getRepositoryWorkflows = vi
      .fn<ForgeOpsApiClient['getRepositoryWorkflows']>()
      .mockResolvedValue([
        {
          id: 'workflow_123',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          sourceType: 'local',
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]);
    const createRepository = vi.fn<ForgeOpsApiClient['createRepository']>();
    const getPullRequests = vi.fn<ForgeOpsApiClient['getPullRequests']>().mockResolvedValue([
      {
        id: 'pr_123',
        githubPrId: '987654321',
        number: 42,
        title: 'Add pull request insights',
        state: 'open',
        author: 'alessandrolsdev',
        baseBranch: 'main',
        headBranch: 'feature/pull-request-insights',
        createdAt: '2026-03-31T18:20:00.000Z',
        updatedAt: '2026-03-31T18:20:00.000Z',
      },
    ]);
    const getWorkflowRuns = vi
      .fn<ForgeOpsApiClient['getWorkflowRuns']>()
      .mockResolvedValue([
        {
          id: 'run_123',
          workflowId: 'workflow_123',
          githubRunId: '1001',
          status: 'completed',
          conclusion: 'success',
          branch: 'main',
          sha: 'abcdef123456',
          event: 'push',
          startedAt: '2026-03-31T11:00:00.000Z',
          finishedAt: '2026-03-31T11:03:00.000Z',
          durationMs: 180000,
          createdAt: '2026-03-31T11:00:00.000Z',
          updatedAt: '2026-03-31T11:03:00.000Z',
        },
      ]);
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories,
      getRepositoryDiscovery,
      getRepositoryWorkflows,
      getPullRequests,
      getPullRequestDetail: vi.fn().mockResolvedValue({
        id: 'pr_123',
        number: 42,
        title: 'Add pull request insights',
        status: 'open',
        author: 'alessandrolsdev',
        summary: null,
        workflows: [],
      }),
      getWorkflowRuns,
      getWorkflowRunDetail: vi.fn().mockResolvedValue({
        run: {
          id: 'run_123',
          workflowId: 'workflow_123',
          githubRunId: '1001',
          status: 'completed',
          conclusion: 'success',
          branch: 'main',
          sha: 'abcdef123456',
          event: 'push',
          startedAt: '2026-03-31T11:00:00.000Z',
          finishedAt: '2026-03-31T11:03:00.000Z',
          durationMs: 180000,
          createdAt: '2026-03-31T11:00:00.000Z',
          updatedAt: '2026-03-31T11:03:00.000Z',
        },
        jobs: [],
      }),
      requestPullRequestCodexReview: vi.fn(),
      createRepository,
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(
        screen.getByText('Workflow catalog for forgeops/backend'),
      ).toBeInTheDocument();
      expect(screen.getByText('.github/workflows/ci.yml')).toBeInTheDocument();
      expect(screen.getByText('Viewing workflows')).toBeInTheDocument();
    });

    expect(getRepositoryWorkflows).toHaveBeenCalledWith('trusted-token', 'repo_123');
    expect(getPullRequests).toHaveBeenCalledWith('trusted-token', 'repo_123');
    await waitFor(() => {
      expect(getWorkflowRuns).toHaveBeenCalledWith(
        'trusted-token',
        'repo_123',
        'workflow_123',
      );
    });
  });

  it('should render pull requests for the selected monitored repository', async () => {
    const getPullRequests = vi
      .fn<ForgeOpsApiClient['getPullRequests']>()
      .mockResolvedValue([
        {
          id: 'pr_123',
          githubPrId: '987654321',
          number: 42,
          title: 'Add pull request insights',
          state: 'open',
          author: 'alessandrolsdev',
          baseBranch: 'main',
          headBranch: 'feature/pull-request-insights',
          createdAt: '2026-03-31T18:20:00.000Z',
          updatedAt: '2026-03-31T18:20:00.000Z',
        },
      ]);
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([]),
      getPullRequests,
      getPullRequestDetail: vi.fn().mockResolvedValue({
        id: 'pr_123',
        number: 42,
        title: 'Add pull request insights',
        status: 'open',
        author: 'alessandrolsdev',
        summary: null,
        workflows: [],
      }),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByText('Pull requests for forgeops/backend')).toBeInTheDocument();
      expect(screen.getByText('PR #42')).toBeInTheDocument();
      expect(screen.getByText('Add pull request insights')).toBeInTheDocument();
      expect(screen.getByText('author: alessandrolsdev')).toBeInTheDocument();
      expect(screen.getByText('state: open')).toBeInTheDocument();
    });

    expect(getPullRequests).toHaveBeenCalledWith('trusted-token', 'repo_123');
  });

  it('should render pull requests loading state', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([]),
      getPullRequests: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByText('Loading pull requests...')).toBeInTheDocument();
    });
  });

  it('should render pull requests empty state', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([]),
      getPullRequests: vi.fn().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(
        screen.getByText('ForgeOps has not synchronized pull requests for this repository yet.'),
      ).toBeInTheDocument();
    });
  });

  it('should render pull requests errors clearly', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([]),
      getPullRequests: vi
        .fn()
        .mockRejectedValue(new ApiClientError('Pull requests are currently unavailable.', 503)),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Pull requests are currently unavailable.'),
      ).toHaveLength(2);
    });
  });

  it('should load pull request detail with summary and linked workflows after selecting a pull request', async () => {
    const getPullRequestDetail = vi
      .fn<ForgeOpsApiClient['getPullRequestDetail']>()
      .mockResolvedValue({
        id: 'pr_123',
        number: 42,
        title: 'Add pull request insights',
        status: 'open',
        author: 'alessandrolsdev',
        summary: {
          blockersCount: 1,
          risksCount: 2,
          suggestionsCount: 1,
          lastReviewedAt: '2026-03-31T18:50:00.000Z',
        },
        workflows: [
          {
            name: 'Deploy',
            status: 'in_progress',
            conclusion: null,
            startedAt: '2026-03-31T19:00:00.000Z',
            finishedAt: null,
          },
          {
            name: 'CI',
            status: 'completed',
            conclusion: 'success',
            startedAt: '2026-03-31T18:40:00.000Z',
            finishedAt: '2026-03-31T18:45:00.000Z',
          },
        ],
      });
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([]),
      getPullRequests: vi.fn().mockResolvedValue([
        {
          id: 'pr_123',
          githubPrId: '987654321',
          number: 42,
          title: 'Add pull request insights',
          state: 'open',
          author: 'alessandrolsdev',
          baseBranch: 'main',
          headBranch: 'feature/pull-request-insights',
          createdAt: '2026-03-31T18:20:00.000Z',
          updatedAt: '2026-03-31T18:20:00.000Z',
        },
      ]),
      getPullRequestDetail,
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Viewing pull request detail' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Viewing pull request detail' }));

    await waitFor(() => {
      expect(screen.getByText('Pull request detail')).toBeInTheDocument();
      expect(screen.getByText('blockers: 1')).toBeInTheDocument();
      expect(screen.getByText('risks: 2')).toBeInTheDocument();
      expect(screen.getByText('suggestions: 1')).toBeInTheDocument();
      expect(screen.getByText('Deploy')).toBeInTheDocument();
      expect(screen.getByText('CI')).toBeInTheDocument();
    });

    expect(getPullRequestDetail).toHaveBeenCalledWith(
      'trusted-token',
      'repo_123',
      'pr_123',
    );
  });

  it('should request a manual Codex review from the pull request detail view', async () => {
    const requestPullRequestCodexReview = vi
      .fn<ForgeOpsApiClient['requestPullRequestCodexReview']>()
      .mockResolvedValue({
        pullRequestId: 'pr_123',
        pullRequestNumber: 42,
        label: 'codex-review',
        status: 'requested',
      });
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([]),
      getPullRequests: vi.fn().mockResolvedValue([
        {
          id: 'pr_123',
          githubPrId: '987654321',
          number: 42,
          title: 'Add pull request insights',
          state: 'open',
          author: 'alessandrolsdev',
          baseBranch: 'main',
          headBranch: 'feature/pull-request-insights',
          createdAt: '2026-03-31T18:20:00.000Z',
          updatedAt: '2026-03-31T18:20:00.000Z',
        },
      ]),
      getPullRequestDetail: vi.fn().mockResolvedValue({
        id: 'pr_123',
        number: 42,
        title: 'Add pull request insights',
        status: 'open',
        author: 'alessandrolsdev',
        summary: null,
        workflows: [],
      }),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview,
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Request Codex review' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Request Codex review' }));

    await waitFor(() => {
      expect(requestPullRequestCodexReview).toHaveBeenCalledWith(
        'trusted-token',
        'repo_123',
        'pr_123',
      );
      expect(
        screen.getByText(
          'Manual Codex review requested for PR #42 via label codex-review.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('should render pull request detail loading state', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([]),
      getPullRequests: vi.fn().mockResolvedValue([
        {
          id: 'pr_123',
          githubPrId: '987654321',
          number: 42,
          title: 'Add pull request insights',
          state: 'open',
          author: 'alessandrolsdev',
          baseBranch: 'main',
          headBranch: 'feature/pull-request-insights',
          createdAt: '2026-03-31T18:20:00.000Z',
          updatedAt: '2026-03-31T18:20:00.000Z',
        },
      ]),
      getPullRequestDetail: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Viewing pull request detail' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Viewing pull request detail' }));

    await waitFor(() => {
      expect(screen.getByText('Loading pull request detail...')).toBeInTheDocument();
    });
  });

  it('should render pull request detail without summary and workflows', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([]),
      getPullRequests: vi.fn().mockResolvedValue([
        {
          id: 'pr_123',
          githubPrId: '987654321',
          number: 42,
          title: 'Add pull request insights',
          state: 'open',
          author: 'alessandrolsdev',
          baseBranch: 'main',
          headBranch: 'feature/pull-request-insights',
          createdAt: '2026-03-31T18:20:00.000Z',
          updatedAt: '2026-03-31T18:20:00.000Z',
        },
      ]),
      getPullRequestDetail: vi.fn().mockResolvedValue({
        id: 'pr_123',
        number: 42,
        title: 'Add pull request insights',
        status: 'open',
        author: 'alessandrolsdev',
        summary: null,
        workflows: [],
      }),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Viewing pull request detail' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Viewing pull request detail' }));

    await waitFor(() => {
      expect(screen.getByText('No Codex review summary is available for this pull request yet.')).toBeInTheDocument();
      expect(screen.getByText('No linked workflow runs were found for this pull request.')).toBeInTheDocument();
    });
  });

  it('should render pull request detail errors clearly', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([]),
      getPullRequests: vi.fn().mockResolvedValue([
        {
          id: 'pr_123',
          githubPrId: '987654321',
          number: 42,
          title: 'Add pull request insights',
          state: 'open',
          author: 'alessandrolsdev',
          baseBranch: 'main',
          headBranch: 'feature/pull-request-insights',
          createdAt: '2026-03-31T18:20:00.000Z',
          updatedAt: '2026-03-31T18:20:00.000Z',
        },
      ]),
      getPullRequestDetail: vi
        .fn()
        .mockRejectedValue(new ApiClientError('Pull request detail is unavailable.', 503)),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Viewing pull request detail' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Viewing pull request detail' }));

    await waitFor(() => {
      expect(screen.getByText('Pull request detail is unavailable.')).toBeInTheDocument();
    });
  });

  it('should render workflow runs loading state while querying runs', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([
        {
          id: 'workflow_123',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          sourceType: 'local',
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getPullRequests: vi.fn().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByText('Loading workflow runs...')).toBeInTheDocument();
    });
  });

  it('should render workflow runs empty state', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([
        {
          id: 'workflow_123',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          sourceType: 'local',
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getPullRequests: vi.fn().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(
        screen.getByText('ForgeOps has not synchronized workflow runs for this workflow yet.'),
      ).toBeInTheDocument();
    });
  });

  it('should render workflow runs errors clearly', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([
        {
          id: 'workflow_123',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          sourceType: 'local',
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getPullRequests: vi.fn().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi
        .fn()
        .mockRejectedValue(new ApiClientError('Workflow runs are currently unavailable.', 503)),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByText('Workflow runs are currently unavailable.')).toBeInTheDocument();
    });
  });

  it('should load workflow run detail with jobs after selecting a run', async () => {
    const getWorkflowRunDetail = vi
      .fn<ForgeOpsApiClient['getWorkflowRunDetail']>()
      .mockResolvedValue({
        run: {
          id: 'run_123',
          workflowId: 'workflow_123',
          githubRunId: '1001',
          status: 'completed',
          conclusion: 'success',
          branch: 'main',
          sha: 'abcdef123456',
          event: 'push',
          startedAt: '2026-03-31T11:00:00.000Z',
          finishedAt: '2026-03-31T11:03:00.000Z',
          durationMs: 180000,
          createdAt: '2026-03-31T11:00:00.000Z',
          updatedAt: '2026-03-31T11:03:00.000Z',
        },
        jobs: [
          {
            id: 'job_123',
            workflowRunId: 'run_123',
            githubJobId: 'job-gh-1',
            name: 'lint',
            status: 'completed',
            conclusion: 'success',
            startedAt: '2026-03-31T11:00:20.000Z',
            finishedAt: '2026-03-31T11:00:50.000Z',
            createdAt: '2026-03-31T11:00:20.000Z',
            updatedAt: '2026-03-31T11:00:50.000Z',
          },
        ],
      });
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([
        {
          id: 'workflow_123',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          sourceType: 'local',
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getPullRequests: vi.fn().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockResolvedValue([
        {
          id: 'run_123',
          workflowId: 'workflow_123',
          githubRunId: '1001',
          status: 'completed',
          conclusion: 'success',
          branch: 'main',
          sha: 'abcdef123456',
          event: 'push',
          startedAt: '2026-03-31T11:00:00.000Z',
          finishedAt: '2026-03-31T11:03:00.000Z',
          durationMs: 180000,
          createdAt: '2026-03-31T11:00:00.000Z',
          updatedAt: '2026-03-31T11:03:00.000Z',
        },
      ]),
      getWorkflowRunDetail,
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View run detail' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View run detail' }));

    await waitFor(() => {
      expect(screen.getByText('Workflow run detail')).toBeInTheDocument();
      expect(screen.getByText('jobs: 1')).toBeInTheDocument();
      expect(screen.getByText('lint')).toBeInTheDocument();
    });

    expect(getWorkflowRunDetail).toHaveBeenCalledWith(
      'trusted-token',
      'repo_123',
      'workflow_123',
      'run_123',
    );
  });

  it('should render workflow run detail loading state', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([
        {
          id: 'workflow_123',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          sourceType: 'local',
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getPullRequests: vi.fn().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockResolvedValue([
        {
          id: 'run_123',
          workflowId: 'workflow_123',
          githubRunId: '1001',
          status: 'completed',
          conclusion: 'success',
          branch: 'main',
          sha: 'abcdef123456',
          event: 'push',
          startedAt: '2026-03-31T11:00:00.000Z',
          finishedAt: '2026-03-31T11:03:00.000Z',
          durationMs: 180000,
          createdAt: '2026-03-31T11:00:00.000Z',
          updatedAt: '2026-03-31T11:03:00.000Z',
        },
      ]),
      getWorkflowRunDetail: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View run detail' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View run detail' }));

    await waitFor(() => {
      expect(screen.getByText('Loading workflow run detail...')).toBeInTheDocument();
    });
  });

  it('should render workflow run detail empty jobs state', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([
        {
          id: 'workflow_123',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          sourceType: 'local',
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getPullRequests: vi.fn().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockResolvedValue([
        {
          id: 'run_123',
          workflowId: 'workflow_123',
          githubRunId: '1001',
          status: 'completed',
          conclusion: 'success',
          branch: 'main',
          sha: 'abcdef123456',
          event: 'push',
          startedAt: '2026-03-31T11:00:00.000Z',
          finishedAt: '2026-03-31T11:03:00.000Z',
          durationMs: 180000,
          createdAt: '2026-03-31T11:00:00.000Z',
          updatedAt: '2026-03-31T11:03:00.000Z',
        },
      ]),
      getWorkflowRunDetail: vi.fn().mockResolvedValue({
        run: {
          id: 'run_123',
          workflowId: 'workflow_123',
          githubRunId: '1001',
          status: 'completed',
          conclusion: 'success',
          branch: 'main',
          sha: 'abcdef123456',
          event: 'push',
          startedAt: '2026-03-31T11:00:00.000Z',
          finishedAt: '2026-03-31T11:03:00.000Z',
          durationMs: 180000,
          createdAt: '2026-03-31T11:00:00.000Z',
          updatedAt: '2026-03-31T11:03:00.000Z',
        },
        jobs: [],
      }),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View run detail' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View run detail' }));

    await waitFor(() => {
      expect(
        screen.getByText('No jobs were synchronized for this workflow run.'),
      ).toBeInTheDocument();
    });
  });

  it('should render workflow run detail errors clearly', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([
        {
          id: 'workflow_123',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          sourceType: 'local',
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getPullRequests: vi.fn().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockResolvedValue([
        {
          id: 'run_123',
          workflowId: 'workflow_123',
          githubRunId: '1001',
          status: 'completed',
          conclusion: 'success',
          branch: 'main',
          sha: 'abcdef123456',
          event: 'push',
          startedAt: '2026-03-31T11:00:00.000Z',
          finishedAt: '2026-03-31T11:03:00.000Z',
          durationMs: 180000,
          createdAt: '2026-03-31T11:00:00.000Z',
          updatedAt: '2026-03-31T11:03:00.000Z',
        },
      ]),
      getWorkflowRunDetail: vi
        .fn()
        .mockRejectedValue(new ApiClientError('Workflow run detail is unavailable.', 503)),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View run detail' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View run detail' }));

    await waitFor(() => {
      expect(screen.getByText('Workflow run detail is unavailable.')).toBeInTheDocument();
    });
  });

  it('should load discovery and connect a repository through the backend client', async () => {
    const getRepositories = vi
      .fn<ForgeOpsApiClient['getRepositories']>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]);
    const getRepositoryDiscovery = vi
      .fn<ForgeOpsApiClient['getRepositoryDiscovery']>()
      .mockResolvedValue([
        {
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isPrivate: true,
        },
      ]);
    const getRepositoryWorkflows = vi
      .fn<ForgeOpsApiClient['getRepositoryWorkflows']>()
      .mockResolvedValue([
        {
          id: 'workflow_123',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          sourceType: 'local',
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]);
    const createRepository = vi
      .fn<ForgeOpsApiClient['createRepository']>()
      .mockResolvedValue({
        id: 'repo_123',
        githubRepoId: '123456789',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
        isActive: true,
        createdAt: '2026-03-28T00:00:00.000Z',
        updatedAt: '2026-03-28T00:00:00.000Z',
      });
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories,
      getRepositoryDiscovery,
      getRepositoryWorkflows,
      getPullRequests: vi.fn().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository,
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByText('forgeops/backend')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Connect repository' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Connect repository' }));

    await waitFor(() => {
      expect(createRepository).toHaveBeenCalledWith('trusted-token', {
        githubRepoId: '123456789',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
      });
      expect(
        screen.getByText('Repository forgeops/backend is now monitored.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Already monitored')).toBeInTheDocument();
    });
  });

  it('should surface backend discovery errors clearly', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([]),
      getRepositoryDiscovery: vi
        .fn()
        .mockRejectedValue(
          new ApiClientError('GitHub repository discovery is currently unavailable.', 503),
        ),
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
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(
        screen.getByText('GitHub repository discovery is currently unavailable.'),
      ).toBeInTheDocument();
    });
  });

  it('should surface repository conflicts clearly and refresh monitored repositories', async () => {
    const getRepositories = vi
      .fn<ForgeOpsApiClient['getRepositories']>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]);
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories,
      getRepositoryDiscovery: vi.fn().mockResolvedValue([
        {
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isPrivate: true,
        },
      ]),
      getRepositoryWorkflows: vi.fn().mockResolvedValue([]),
      getPullRequests: vi.fn().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi
        .fn()
        .mockRejectedValue(
          new ApiClientError('Repository is already monitored.', 409, 'repository_already_exists'),
        ),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Connect repository' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Connect repository' }));

    await waitFor(() => {
      expect(screen.getByText('Repository is already monitored.')).toBeInTheDocument();
      expect(screen.getByText('Already monitored')).toBeInTheDocument();
      expect(getRepositories).toHaveBeenCalledTimes(2);
    });
  });

  it('should surface workflow catalog errors clearly for the selected repository', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi.fn().mockResolvedValue([]),
      getRepositoryWorkflows: vi
        .fn()
        .mockRejectedValue(
          new ApiClientError('Repository was not found.', 404, 'repository_not_found'),
        ),
      getPullRequests: vi.fn().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi.fn(),
      getRepositorySyncEvents: vi.fn(),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByText('Repository was not found.')).toBeInTheDocument();
    });
  });

  it('should render review insights and the sync audit trail for the selected repository', async () => {
    const client: ForgeOpsApiClient = {
      getHealth: vi.fn(),
      getRepositories: vi.fn<ForgeOpsApiClient['getRepositories']>().mockResolvedValue([
        {
          id: 'repo_123',
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
          isActive: true,
          createdAt: '2026-03-28T00:00:00.000Z',
          updatedAt: '2026-03-28T00:00:00.000Z',
        },
      ]),
      getRepositoryDiscovery: vi
        .fn<ForgeOpsApiClient['getRepositoryDiscovery']>()
        .mockResolvedValue([]),
      getRepositoryWorkflows: vi
        .fn<ForgeOpsApiClient['getRepositoryWorkflows']>()
        .mockResolvedValue([]),
      getPullRequests: vi.fn<ForgeOpsApiClient['getPullRequests']>().mockResolvedValue([]),
      getPullRequestDetail: vi.fn(),
      getWorkflowRuns: vi.fn<ForgeOpsApiClient['getWorkflowRuns']>().mockResolvedValue([]),
      getWorkflowRunDetail: vi.fn(),
      requestPullRequestCodexReview: vi.fn(),
      createRepository: vi.fn(),
      getAutomationHealthOverview: vi.fn(),
      getRepositoryAutomationHealth: vi.fn(),
      getRepositoryPolicyChecks: vi.fn(),
      evaluateRepositoryPolicyChecks: vi.fn(),
      getRepositoryReviewInsights: vi
        .fn<ForgeOpsApiClient['getRepositoryReviewInsights']>()
        .mockResolvedValue({
          repositoryId: 'repo_123',
          openPullRequestCount: 1,
          reviewedPullRequestCount: 2,
          openBlockersCount: 2,
          totalBlockersCount: 3,
          totalRisksCount: 4,
          totalSuggestionsCount: 5,
          lastReviewedAt: '2026-07-01T09:00:00.000Z',
        }),
      getRepositorySyncEvents: vi
        .fn<ForgeOpsApiClient['getRepositorySyncEvents']>()
        .mockResolvedValue([
          {
            id: 'sync_1',
            repositoryId: 'repo_123',
            type: 'repository_connected',
            status: 'succeeded',
            details: 'Repositorio forgeops/backend conectado e ingerido.',
            createdAt: '2026-07-01T08:00:00.000Z',
          },
        ]),
    };

    renderRepositoriesView(client);

    fireEvent.change(screen.getByLabelText('Operator bearer token'), {
      target: { value: 'trusted-token' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Use access token' }));

    await waitFor(() => {
      expect(screen.getByText('open blockers: 2')).toBeInTheDocument();
    });

    expect(screen.getByText('open PRs: 1')).toBeInTheDocument();
    expect(screen.getByText('reviewed PRs: 2')).toBeInTheDocument();
    expect(screen.getByText('Repository connected')).toBeInTheDocument();
    expect(
      screen.getByText('Repositorio forgeops/backend conectado e ingerido.'),
    ).toBeInTheDocument();
    expect(client.getRepositoryReviewInsights).toHaveBeenCalledWith(
      'trusted-token',
      'repo_123',
    );
    expect(client.getRepositorySyncEvents).toHaveBeenCalledWith(
      'trusted-token',
      'repo_123',
    );
  });
});
