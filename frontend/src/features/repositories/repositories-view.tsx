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
  type RepositoryDiscoveryItem,
} from '@/lib/api/client';

const STORAGE_KEY = 'forgeops.operator-access-token';
const EMPTY_MONITORED_REPOSITORIES: MonitoredRepository[] = [];
const EMPTY_DISCOVERED_REPOSITORIES: RepositoryDiscoveryItem[] = [];

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};

interface RepositoriesViewProps {
  client?: ForgeOpsApiClient;
}

export function RepositoriesView({ client = createApiClient() }: RepositoriesViewProps) {
  const queryClient = useQueryClient();
  const [draftAccessToken, setDraftAccessToken] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
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

  const monitoredRepositoryNames = new Set(
    monitoredRepositories.map((repository) => repository.fullName),
  );
  const selectedRepository =
    monitoredRepositories.find((repository) => repository.id === selectedRepositoryId) ?? null;
  const repositoryWorkflows = workflowsQuery.data ?? [];

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
    </div>
  );
}
