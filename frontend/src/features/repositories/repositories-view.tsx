'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ApiClientError,
  createApiClient,
  type ForgeOpsApiClient,
  type MonitoredRepository,
  type PullRequestDetailResponse,
  type PullRequestItem,
  type RepositoryDiscoveryItem,
  type WorkflowCatalogItem,
  type WorkflowRunDetailResponse,
  type WorkflowRunItem,
} from '@/lib/api/client';

const STORAGE_KEY = 'forgeops.operator-access-token';
const EMPTY_MONITORED_REPOSITORIES: MonitoredRepository[] = [];
const EMPTY_DISCOVERED_REPOSITORIES: RepositoryDiscoveryItem[] = [];
const EMPTY_WORKFLOWS: WorkflowCatalogItem[] = [];
const EMPTY_PULL_REQUESTS: PullRequestItem[] = [];
const EMPTY_PULL_REQUEST_WORKFLOWS: PullRequestDetailResponse['workflows'] = [];
const EMPTY_WORKFLOW_RUNS: WorkflowRunItem[] = [];
const EMPTY_WORKFLOW_RUN_DETAIL_JOBS: WorkflowRunDetailResponse['jobs'] = [];

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};

const formatTimestamp = (value: string | null): string => {
  if (!value) {
    return 'n/a';
  }

  return new Date(value).toLocaleString();
};

const formatDuration = (durationMs: number | null): string => {
  if (durationMs === null) {
    return 'n/a';
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds}s`;
};

interface RepositoriesViewProps {
  client?: ForgeOpsApiClient;
}

export function RepositoriesView({ client = createApiClient() }: RepositoriesViewProps) {
  const queryClient = useQueryClient();
  const [draftAccessToken, setDraftAccessToken] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
  const [selectedPullRequestId, setSelectedPullRequestId] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedWorkflowRunId, setSelectedWorkflowRunId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const hasAccessToken = accessToken.trim().length > 0;

  useEffect(() => {
    const storedToken = window.localStorage.getItem(STORAGE_KEY);

    if (!storedToken) {
      return;
    }

    setAccessToken(storedToken);
    setDraftAccessToken(storedToken);
  }, []);

  const monitoredRepositoriesQuery = useQuery({
    queryKey: ['repositories', accessToken],
    queryFn: () => client.getRepositories(accessToken),
    enabled: hasAccessToken,
    retry: false,
  });

  const discoveryQuery = useQuery({
    queryKey: ['repository-discovery', accessToken],
    queryFn: () => client.getRepositoryDiscovery(accessToken),
    enabled: hasAccessToken,
    retry: false,
  });

  const monitoredRepositories =
    monitoredRepositoriesQuery.data ?? EMPTY_MONITORED_REPOSITORIES;
  const discoveredRepositories = discoveryQuery.data ?? EMPTY_DISCOVERED_REPOSITORIES;

  useEffect(() => {
    if (monitoredRepositories.length === 0) {
      setSelectedRepositoryId(null);
      return;
    }

    const selectedExists = monitoredRepositories.some(
      (repository) => repository.id === selectedRepositoryId,
    );

    const firstRepository = monitoredRepositories[0];

    if (!selectedRepositoryId || !selectedExists) {
      setSelectedRepositoryId(firstRepository?.id ?? null);
    }
  }, [monitoredRepositories, selectedRepositoryId]);

  const workflowsQuery = useQuery({
    queryKey: ['repository-workflows', accessToken, selectedRepositoryId],
    queryFn: () => client.getRepositoryWorkflows(accessToken, selectedRepositoryId!),
    enabled: hasAccessToken && selectedRepositoryId !== null,
    retry: false,
  });

  const repositoryWorkflows = workflowsQuery.data ?? EMPTY_WORKFLOWS;

  const pullRequestsQuery = useQuery({
    queryKey: ['pull-requests', accessToken, selectedRepositoryId],
    queryFn: () => client.getPullRequests(accessToken, selectedRepositoryId!),
    enabled: hasAccessToken && selectedRepositoryId !== null,
    retry: false,
  });

  const pullRequests = pullRequestsQuery.data ?? EMPTY_PULL_REQUESTS;

  useEffect(() => {
    if (pullRequests.length === 0) {
      setSelectedPullRequestId(null);
      return;
    }

    const selectedExists = pullRequests.some(
      (pullRequest) => pullRequest.id === selectedPullRequestId,
    );
    const firstPullRequest = pullRequests[0];

    if (!selectedPullRequestId || !selectedExists) {
      setSelectedPullRequestId(firstPullRequest?.id ?? null);
    }
  }, [pullRequests, selectedPullRequestId]);

  const pullRequestDetailQuery = useQuery({
    queryKey: ['pull-request-detail', accessToken, selectedRepositoryId, selectedPullRequestId],
    queryFn: () =>
      client.getPullRequestDetail(accessToken, selectedRepositoryId!, selectedPullRequestId!),
    enabled:
      hasAccessToken &&
      selectedRepositoryId !== null &&
      selectedPullRequestId !== null,
    retry: false,
  });

  useEffect(() => {
    if (repositoryWorkflows.length === 0) {
      setSelectedWorkflowId(null);
      return;
    }

    const selectedExists = repositoryWorkflows.some(
      (workflow) => workflow.id === selectedWorkflowId,
    );
    const firstWorkflow = repositoryWorkflows[0];

    if (!selectedWorkflowId || !selectedExists) {
      setSelectedWorkflowId(firstWorkflow?.id ?? null);
    }
  }, [repositoryWorkflows, selectedWorkflowId]);

  const workflowRunsQuery = useQuery({
    queryKey: ['workflow-runs', accessToken, selectedRepositoryId, selectedWorkflowId],
    queryFn: () =>
      client.getWorkflowRuns(accessToken, selectedRepositoryId!, selectedWorkflowId!),
    enabled:
      hasAccessToken && selectedRepositoryId !== null && selectedWorkflowId !== null,
    retry: false,
  });

  const workflowRuns = workflowRunsQuery.data ?? EMPTY_WORKFLOW_RUNS;

  useEffect(() => {
    if (workflowRuns.length === 0) {
      setSelectedWorkflowRunId(null);
      return;
    }

    if (!selectedWorkflowRunId) {
      return;
    }

    const selectedExists = workflowRuns.some((workflowRun) => workflowRun.id === selectedWorkflowRunId);

    if (!selectedExists) {
      setSelectedWorkflowRunId(null);
    }
  }, [workflowRuns, selectedWorkflowRunId]);

  const workflowRunDetailQuery = useQuery({
    queryKey: [
      'workflow-run-detail',
      accessToken,
      selectedRepositoryId,
      selectedWorkflowId,
      selectedWorkflowRunId,
    ],
    queryFn: () =>
      client.getWorkflowRunDetail(
        accessToken,
        selectedRepositoryId!,
        selectedWorkflowId!,
        selectedWorkflowRunId!,
      ),
    enabled:
      hasAccessToken &&
      selectedRepositoryId !== null &&
      selectedWorkflowId !== null &&
      selectedWorkflowRunId !== null,
    retry: false,
  });

  const createRepositoryMutation = useMutation({
    mutationFn: (repository: RepositoryDiscoveryItem) =>
      client.createRepository(accessToken, {
        githubRepoId: repository.githubRepoId,
        owner: repository.owner,
        name: repository.name,
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
      }),
    onSuccess: async (repository) => {
      setStatusMessage(`Repository ${repository.fullName} is now monitored.`);
      setSelectedRepositoryId(repository.id);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['repositories', accessToken],
        }),
        queryClient.invalidateQueries({
          queryKey: ['repository-workflows', accessToken, repository.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['pull-requests', accessToken, repository.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['pull-request-detail', accessToken, repository.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['workflow-runs', accessToken, repository.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['workflow-run-detail', accessToken, repository.id],
        }),
      ]);
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.code === 'repository_already_exists') {
        void queryClient.invalidateQueries({
          queryKey: ['repositories', accessToken],
        });
      }

      setStatusMessage(getErrorMessage(error, 'Unable to connect the repository right now.'));
    },
  });

  const requestPullRequestCodexReviewMutation = useMutation({
    mutationFn: () =>
      client.requestPullRequestCodexReview(
        accessToken,
        selectedRepositoryId!,
        selectedPullRequestId!,
      ),
    onSuccess: (request) => {
      setStatusMessage(
        `Manual Codex review requested for PR #${request.pullRequestNumber} via label ${request.label}.`,
      );
    },
    onError: (error) => {
      setStatusMessage(
        getErrorMessage(error, 'Unable to request a manual Codex review right now.'),
      );
    },
  });

  const monitoredRepositoryNames = new Set(
    monitoredRepositories.map((repository) => repository.fullName),
  );
  const selectedRepository =
    monitoredRepositories.find((repository) => repository.id === selectedRepositoryId) ?? null;
  const selectedPullRequest =
    pullRequests.find((pullRequest) => pullRequest.id === selectedPullRequestId) ?? null;
  const selectedWorkflow =
    repositoryWorkflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null;
  const selectedWorkflowRun =
    workflowRuns.find((workflowRun) => workflowRun.id === selectedWorkflowRunId) ?? null;
  const pullRequestDetail = pullRequestDetailQuery.data;
  const workflowRunDetail = workflowRunDetailQuery.data;

  const submitAccessToken = () => {
    const normalizedToken = draftAccessToken.trim();

    if (normalizedToken.length === 0) {
      setTokenError('Provide an operator access token to query protected repository APIs.');
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, normalizedToken);
    setAccessToken(normalizedToken);
    setTokenError(null);
    setStatusMessage(null);
  };

  const clearAccessToken = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setDraftAccessToken('');
    setAccessToken('');
    setSelectedRepositoryId(null);
    setSelectedPullRequestId(null);
    setSelectedWorkflowId(null);
    setSelectedWorkflowRunId(null);
    setTokenError(null);
    setStatusMessage(null);
    void queryClient.removeQueries({
      queryKey: ['repositories'],
    });
    void queryClient.removeQueries({
      queryKey: ['repository-discovery'],
    });
    void queryClient.removeQueries({
      queryKey: ['repository-workflows'],
    });
    void queryClient.removeQueries({
      queryKey: ['pull-requests'],
    });
    void queryClient.removeQueries({
      queryKey: ['pull-request-detail'],
    });
    void queryClient.removeQueries({
      queryKey: ['workflow-runs'],
    });
    void queryClient.removeQueries({
      queryKey: ['workflow-run-detail'],
    });
  };

  return (
    <div className="page-stack">
      <section className="page-header">
        <span className="page-header__eyebrow">Repositories</span>
        <h2 className="page-header__title">Inspect repository automation from one place.</h2>
        <p className="page-header__description">
          Repository onboarding, catalog discovery, and workflow visibility now share the same
          protected frontend flow so the operator can move from connection to catalog inspection
          without leaving the page.
        </p>
      </section>

      <Card eyebrow="Operator access" title="Protected backend access">
        <div className="repository-access">
          <Input
            id="operatorAccessToken"
            label="Operator bearer token"
            placeholder="Paste a bearer token for protected repository APIs"
            autoComplete="off"
            value={draftAccessToken}
            onChange={(event) => setDraftAccessToken(event.target.value)}
            error={tokenError ?? undefined}
          />
          <div className="repository-access__actions">
            <Button onClick={submitAccessToken}>Use access token</Button>
            <Button variant="secondary" onClick={clearAccessToken}>
              Clear token
            </Button>
          </div>
          <p className="repository-access__hint">
            The token is stored only in this browser session so the frontend can call the protected
            backend endpoints while the dedicated auth flow is still pending.
          </p>
        </div>
      </Card>

      {statusMessage ? (
        <div className="status-banner" role="status">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid grid--two">
        <Card eyebrow="Connected" title="Monitored repositories">
          {!hasAccessToken ? (
            <p className="empty-state">
              Add an operator token to load the repositories already monitored by ForgeOps.
            </p>
          ) : monitoredRepositoriesQuery.isLoading ? (
            <p className="empty-state">Loading monitored repositories...</p>
          ) : monitoredRepositoriesQuery.isError ? (
            <p className="empty-state">
              {getErrorMessage(
                monitoredRepositoriesQuery.error,
                'Unable to load monitored repositories.',
              )}
            </p>
          ) : monitoredRepositories.length === 0 ? (
            <p className="empty-state">
              No repositories are monitored yet. Use discovery to connect the first one.
            </p>
          ) : (
            <ul className="repository-list">
              {monitoredRepositories.map((repository) => {
                const isSelected = repository.id === selectedRepositoryId;

                return (
                  <li key={repository.id} className="repository-list__item">
                    <div className="repository-list__summary">
                      <strong>{repository.fullName}</strong>
                      <span>Default branch: {repository.defaultBranch}</span>
                    </div>
                    <div className="repository-list__actions">
                      <span className="repository-list__badge">
                        {repository.isActive ? 'Monitoring active' : 'Paused'}
                      </span>
                      <Button
                        variant={isSelected ? 'secondary' : 'primary'}
                        onClick={() => setSelectedRepositoryId(repository.id)}
                      >
                        {isSelected ? 'Viewing workflows' : 'View workflows'}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card eyebrow="Discovery" title="Available GitHub repositories">
          {!hasAccessToken ? (
            <p className="empty-state">
              Add an operator token to query repository discovery through the backend.
            </p>
          ) : discoveryQuery.isLoading ? (
            <p className="empty-state">Loading available repositories...</p>
          ) : discoveryQuery.isError ? (
            <p className="empty-state">
              {getErrorMessage(discoveryQuery.error, 'Unable to load repository discovery.')}
            </p>
          ) : discoveredRepositories.length === 0 ? (
            <p className="empty-state">
              No repositories were returned by the GitHub App installation right now.
            </p>
          ) : (
            <ul className="repository-list">
              {discoveredRepositories.map((repository) => {
                const isMonitored = monitoredRepositoryNames.has(repository.fullName);

                return (
                  <li key={repository.githubRepoId} className="repository-list__item">
                    <div className="repository-list__summary">
                      <strong>{repository.fullName}</strong>
                      <span>
                        Default branch: {repository.defaultBranch} -{' '}
                        {repository.isPrivate ? 'Private' : 'Public'}
                      </span>
                    </div>
                    {isMonitored ? (
                      <span className="repository-list__badge">Already monitored</span>
                    ) : (
                      <Button
                        onClick={() => createRepositoryMutation.mutate(repository)}
                        disabled={createRepositoryMutation.isPending}
                      >
                        {createRepositoryMutation.isPending
                          ? 'Connecting...'
                          : 'Connect repository'}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card
        eyebrow="Pull requests"
        title={
          selectedRepository
            ? `Pull requests for ${selectedRepository.fullName}`
            : 'Pull requests'
        }
      >
        {!hasAccessToken ? (
          <p className="empty-state">
            Add an operator token to inspect pull requests for monitored repositories.
          </p>
        ) : monitoredRepositoriesQuery.isLoading ? (
          <p className="empty-state">Loading repositories before fetching pull requests...</p>
        ) : monitoredRepositories.length === 0 ? (
          <p className="empty-state">
            Connect a repository first so ForgeOps can show pull requests.
          </p>
        ) : !selectedRepository ? (
          <p className="empty-state">
            Select a monitored repository to inspect pull requests.
          </p>
        ) : pullRequestsQuery.isLoading ? (
          <p className="empty-state">Loading pull requests...</p>
        ) : pullRequestsQuery.isError ? (
          <p className="empty-state">
            {getErrorMessage(pullRequestsQuery.error, 'Unable to load pull requests.')}
          </p>
        ) : pullRequests.length === 0 ? (
          <p className="empty-state">
            ForgeOps has not synchronized pull requests for this repository yet.
          </p>
        ) : (
          <ul className="workflow-runs-list">
            {pullRequests.map((pullRequest) => (
              <li key={pullRequest.id} className="workflow-runs-list__item">
                <div className="workflow-runs-list__summary">
                  <strong>PR #{pullRequest.number}</strong>
                  <span>{pullRequest.title}</span>
                </div>
                <div className="workflow-runs-list__meta">
                  <span className="repository-list__badge repository-list__badge--neutral">
                    state: {pullRequest.state}
                  </span>
                  <span className="repository-list__badge repository-list__badge--neutral">
                    author: {pullRequest.author}
                  </span>
                  <span className="repository-list__badge repository-list__badge--neutral">
                    base: {pullRequest.baseBranch}
                  </span>
                  <span className="repository-list__badge repository-list__badge--neutral">
                    head: {pullRequest.headBranch}
                  </span>
                  <span className="repository-list__badge repository-list__badge--neutral">
                    updated: {formatTimestamp(pullRequest.updatedAt)}
                  </span>
                </div>
                <div className="workflow-runs-list__actions">
                  <Button
                    variant={pullRequest.id === selectedPullRequestId ? 'secondary' : 'primary'}
                    onClick={() => setSelectedPullRequestId(pullRequest.id)}
                  >
                    {pullRequest.id === selectedPullRequestId
                      ? 'Viewing pull request detail'
                      : 'View pull request detail'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        eyebrow="Pull request detail"
        title={selectedPullRequest ? `PR #${selectedPullRequest.number}` : 'Pull request detail'}
      >
        {!hasAccessToken ? (
          <p className="empty-state">
            Add an operator token to inspect pull request details.
          </p>
        ) : !selectedRepository ? (
          <p className="empty-state">Select a repository to inspect pull request details.</p>
        ) : pullRequestsQuery.isLoading ? (
          <p className="empty-state">Loading pull requests before showing detail...</p>
        ) : pullRequestsQuery.isError ? (
          <p className="empty-state">
            {getErrorMessage(pullRequestsQuery.error, 'Unable to load pull requests.')}
          </p>
        ) : pullRequests.length === 0 ? (
          <p className="empty-state">No pull requests are available yet for this repository.</p>
        ) : !selectedPullRequest ? (
          <p className="empty-state">Select a pull request to load detail.</p>
        ) : pullRequestDetailQuery.isLoading ? (
          <p className="empty-state">Loading pull request detail...</p>
        ) : pullRequestDetailQuery.isError ? (
          <p className="empty-state">
            {getErrorMessage(
              pullRequestDetailQuery.error,
              'Unable to load pull request detail.',
            )}
          </p>
        ) : !pullRequestDetail ? (
          <p className="empty-state">Pull request detail is unavailable.</p>
        ) : (
          <div className="workflow-run-detail">
            <div className="workflow-runs-list__actions">
              <Button
                onClick={() => requestPullRequestCodexReviewMutation.mutate()}
                disabled={requestPullRequestCodexReviewMutation.isPending}
              >
                {requestPullRequestCodexReviewMutation.isPending
                  ? 'Requesting Codex review...'
                  : 'Request Codex review'}
              </Button>
            </div>

            <div className="workflow-runs-list__meta">
              <span className="repository-list__badge repository-list__badge--neutral">
                status: {pullRequestDetail.status}
              </span>
              <span className="repository-list__badge repository-list__badge--neutral">
                author: {pullRequestDetail.author}
              </span>
              <span className="repository-list__badge repository-list__badge--neutral">
                title: {pullRequestDetail.title}
              </span>
            </div>

            {pullRequestDetail.summary ? (
              <div className="workflow-runs-list__meta">
                <span className="repository-list__badge repository-list__badge--neutral">
                  blockers: {pullRequestDetail.summary.blockersCount}
                </span>
                <span className="repository-list__badge repository-list__badge--neutral">
                  risks: {pullRequestDetail.summary.risksCount}
                </span>
                <span className="repository-list__badge repository-list__badge--neutral">
                  suggestions: {pullRequestDetail.summary.suggestionsCount}
                </span>
                <span className="repository-list__badge repository-list__badge--neutral">
                  reviewed: {formatTimestamp(pullRequestDetail.summary.lastReviewedAt)}
                </span>
              </div>
            ) : (
              <p className="empty-state">
                No Codex review summary is available for this pull request yet.
              </p>
            )}

            {pullRequestDetail.workflows.length === 0 ? (
              <p className="empty-state">
                No linked workflow runs were found for this pull request.
              </p>
            ) : (
              <ul className="workflow-runs-list">
                {(pullRequestDetail.workflows ?? EMPTY_PULL_REQUEST_WORKFLOWS).map((workflow) => (
                  <li
                    key={`${workflow.name}-${workflow.startedAt ?? workflow.finishedAt ?? workflow.status}`}
                    className="workflow-runs-list__item"
                  >
                    <div className="workflow-runs-list__summary">
                      <strong>{workflow.name}</strong>
                      <span>{workflow.conclusion ?? 'in progress'}</span>
                    </div>
                    <div className="workflow-runs-list__meta">
                      <span className="repository-list__badge repository-list__badge--neutral">
                        status: {workflow.status}
                      </span>
                      <span className="repository-list__badge repository-list__badge--neutral">
                        conclusion: {workflow.conclusion ?? 'n/a'}
                      </span>
                      <span className="repository-list__badge repository-list__badge--neutral">
                        started: {formatTimestamp(workflow.startedAt)}
                      </span>
                      <span className="repository-list__badge repository-list__badge--neutral">
                        finished: {formatTimestamp(workflow.finishedAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <Card
        eyebrow="Workflow catalog"
        title={
          selectedRepository
            ? `Workflow catalog for ${selectedRepository.fullName}`
            : 'Workflow catalog'
        }
      >
        {!hasAccessToken ? (
          <p className="empty-state">
            Add an operator token to inspect workflow catalogs for monitored repositories.
          </p>
        ) : monitoredRepositoriesQuery.isLoading ? (
          <p className="empty-state">Loading repositories before fetching the workflow catalog...</p>
        ) : monitoredRepositories.length === 0 ? (
          <p className="empty-state">
            Connect a repository first so ForgeOps can show its workflow catalog.
          </p>
        ) : !selectedRepository ? (
          <p className="empty-state">
            Select a monitored repository to inspect the current workflow catalog.
          </p>
        ) : workflowsQuery.isLoading ? (
          <p className="empty-state">Loading workflow catalog...</p>
        ) : workflowsQuery.isError ? (
          <p className="empty-state">
            {getErrorMessage(workflowsQuery.error, 'Unable to load the workflow catalog.')}
          </p>
        ) : repositoryWorkflows.length === 0 ? (
          <p className="empty-state">
            ForgeOps has not cataloged workflows for this repository yet.
          </p>
        ) : (
          <ul className="workflow-list">
            {repositoryWorkflows.map((workflow) => (
              <li key={workflow.id} className="workflow-list__item">
                <div className="workflow-list__summary">
                  <strong>{workflow.name}</strong>
                  <span>{workflow.path}</span>
                </div>
                <div className="workflow-list__meta">
                  <span className="repository-list__badge">
                    {workflow.sourceType === 'reusable' ? 'Reusable' : 'Local'}
                  </span>
                  <span className="repository-list__badge repository-list__badge--neutral">
                    {workflow.state}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        eyebrow="Workflow runs"
        title={
          selectedWorkflow
            ? `Workflow runs for ${selectedWorkflow.name}`
            : 'Workflow runs'
        }
      >
        {!hasAccessToken ? (
          <p className="empty-state">
            Add an operator token to inspect workflow runs for cataloged workflows.
          </p>
        ) : monitoredRepositoriesQuery.isLoading ? (
          <p className="empty-state">Loading repositories before fetching workflow runs...</p>
        ) : monitoredRepositories.length === 0 ? (
          <p className="empty-state">
            Connect a repository first so ForgeOps can show workflow runs.
          </p>
        ) : !selectedRepository ? (
          <p className="empty-state">
            Select a monitored repository to inspect workflow runs.
          </p>
        ) : workflowsQuery.isLoading ? (
          <p className="empty-state">Loading workflows before fetching workflow runs...</p>
        ) : repositoryWorkflows.length === 0 ? (
          <p className="empty-state">
            Catalog workflows first before inspecting workflow runs.
          </p>
        ) : !selectedWorkflow ? (
          <p className="empty-state">Select a workflow to inspect workflow runs.</p>
        ) : workflowRunsQuery.isLoading ? (
          <p className="empty-state">Loading workflow runs...</p>
        ) : workflowRunsQuery.isError ? (
          <p className="empty-state">
            {getErrorMessage(workflowRunsQuery.error, 'Unable to load workflow runs.')}
          </p>
        ) : workflowRuns.length === 0 ? (
          <p className="empty-state">
            ForgeOps has not synchronized workflow runs for this workflow yet.
          </p>
        ) : (
          <ul className="workflow-runs-list">
            {workflowRuns.map((run) => (
              <li key={run.id} className="workflow-runs-list__item">
                <div className="workflow-runs-list__summary">
                  <strong>Run #{run.githubRunId}</strong>
                  <span>sha {run.sha.slice(0, 12)}</span>
                </div>
                <div className="workflow-runs-list__meta">
                  <span className="repository-list__badge repository-list__badge--neutral">
                    status: {run.status}
                  </span>
                  <span className="repository-list__badge repository-list__badge--neutral">
                    conclusion: {run.conclusion ?? 'n/a'}
                  </span>
                  <span className="repository-list__badge repository-list__badge--neutral">
                    branch: {run.branch}
                  </span>
                  <span className="repository-list__badge repository-list__badge--neutral">
                    event: {run.event}
                  </span>
                  <span className="repository-list__badge repository-list__badge--neutral">
                    started: {formatTimestamp(run.startedAt)}
                  </span>
                  <span className="repository-list__badge repository-list__badge--neutral">
                    finished: {formatTimestamp(run.finishedAt)}
                  </span>
                  <span className="repository-list__badge repository-list__badge--neutral">
                    duration: {formatDuration(run.durationMs)}
                  </span>
                </div>
                <div className="workflow-runs-list__actions">
                  <Button
                    variant={run.id === selectedWorkflowRunId ? 'secondary' : 'primary'}
                    onClick={() => setSelectedWorkflowRunId(run.id)}
                  >
                    {run.id === selectedWorkflowRunId ? 'Viewing run detail' : 'View run detail'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        eyebrow="Workflow run detail"
        title={selectedWorkflowRun ? `Run #${selectedWorkflowRun.githubRunId}` : 'Workflow run detail'}
      >
        {!hasAccessToken ? (
          <p className="empty-state">
            Add an operator token to inspect workflow run details.
          </p>
        ) : !selectedRepository ? (
          <p className="empty-state">Select a repository to inspect run details.</p>
        ) : !selectedWorkflow ? (
          <p className="empty-state">Select a workflow to inspect run details.</p>
        ) : workflowRunsQuery.isLoading ? (
          <p className="empty-state">Loading workflow runs before showing run detail...</p>
        ) : workflowRuns.length === 0 ? (
          <p className="empty-state">
            No workflow runs are available yet for this workflow.
          </p>
        ) : !selectedWorkflowRun ? (
          <p className="empty-state">Select a workflow run to load detail.</p>
        ) : workflowRunDetailQuery.isLoading ? (
          <p className="empty-state">Loading workflow run detail...</p>
        ) : workflowRunDetailQuery.isError ? (
          <p className="empty-state">
            {getErrorMessage(workflowRunDetailQuery.error, 'Unable to load workflow run detail.')}
          </p>
        ) : !workflowRunDetail ? (
          <p className="empty-state">Workflow run detail is unavailable.</p>
        ) : (
          <div className="workflow-run-detail">
            <div className="workflow-runs-list__meta">
              <span className="repository-list__badge repository-list__badge--neutral">
                status: {workflowRunDetail.run.status}
              </span>
              <span className="repository-list__badge repository-list__badge--neutral">
                conclusion: {workflowRunDetail.run.conclusion ?? 'n/a'}
              </span>
              <span className="repository-list__badge repository-list__badge--neutral">
                branch: {workflowRunDetail.run.branch}
              </span>
              <span className="repository-list__badge repository-list__badge--neutral">
                event: {workflowRunDetail.run.event}
              </span>
              <span className="repository-list__badge repository-list__badge--neutral">
                started: {formatTimestamp(workflowRunDetail.run.startedAt)}
              </span>
              <span className="repository-list__badge repository-list__badge--neutral">
                finished: {formatTimestamp(workflowRunDetail.run.finishedAt)}
              </span>
              <span className="repository-list__badge repository-list__badge--neutral">
                duration: {formatDuration(workflowRunDetail.run.durationMs)}
              </span>
              <span className="repository-list__badge repository-list__badge--neutral">
                jobs: {workflowRunDetail.jobs.length}
              </span>
            </div>

            {workflowRunDetail.jobs.length === 0 ? (
              <p className="empty-state">No jobs were synchronized for this workflow run.</p>
            ) : (
              <ul className="workflow-jobs-list">
                {(workflowRunDetail.jobs ?? EMPTY_WORKFLOW_RUN_DETAIL_JOBS).map((job) => (
                  <li key={job.id} className="workflow-jobs-list__item">
                    <div className="workflow-jobs-list__summary">
                      <strong>{job.name}</strong>
                      <span>job id: {job.githubJobId}</span>
                    </div>
                    <div className="workflow-runs-list__meta">
                      <span className="repository-list__badge repository-list__badge--neutral">
                        status: {job.status}
                      </span>
                      <span className="repository-list__badge repository-list__badge--neutral">
                        conclusion: {job.conclusion ?? 'n/a'}
                      </span>
                      <span className="repository-list__badge repository-list__badge--neutral">
                        started: {formatTimestamp(job.startedAt)}
                      </span>
                      <span className="repository-list__badge repository-list__badge--neutral">
                        finished: {formatTimestamp(job.finishedAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
