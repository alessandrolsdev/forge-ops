'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ApiClientError,
  createApiClient,
  type AutomationHealthScore,
  type ForgeOpsApiClient,
  type PolicyCheckItem,
} from '@/lib/api/client';
import { HealthScoreCard } from './components/health-score-card';
import { PolicyChecksPanel } from './components/policy-checks-panel';

const STORAGE_KEY = 'forgeops.operator-access-token';
const EMPTY_HEALTH_SCORES: AutomationHealthScore[] = [];
const EMPTY_POLICY_CHECKS: PolicyCheckItem[] = [];

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};

interface AutomationHealthViewProps {
  client?: ForgeOpsApiClient;
}

export function AutomationHealthView({
  client = createApiClient(),
}: AutomationHealthViewProps) {
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

  const overviewQuery = useQuery({
    queryKey: ['automation-health', accessToken],
    queryFn: () => client.getAutomationHealthOverview(accessToken),
    enabled: hasAccessToken,
    retry: false,
  });

  const healthScores = overviewQuery.data ?? EMPTY_HEALTH_SCORES;

  useEffect(() => {
    if (healthScores.length === 0) {
      setSelectedRepositoryId(null);
      return;
    }

    const selectedExists = healthScores.some(
      (health) => health.repositoryId === selectedRepositoryId,
    );

    if (!selectedRepositoryId || !selectedExists) {
      setSelectedRepositoryId(healthScores[0]?.repositoryId ?? null);
    }
  }, [healthScores, selectedRepositoryId]);

  const policyChecksQuery = useQuery({
    queryKey: ['policy-checks', accessToken, selectedRepositoryId],
    queryFn: () => client.getRepositoryPolicyChecks(accessToken, selectedRepositoryId!),
    enabled: hasAccessToken && selectedRepositoryId !== null,
    retry: false,
  });

  const evaluatePoliciesMutation = useMutation({
    mutationFn: () =>
      client.evaluateRepositoryPolicyChecks(accessToken, selectedRepositoryId!),
    onSuccess: () => {
      setStatusMessage('Policy evaluation completed.');
      void queryClient.invalidateQueries({ queryKey: ['policy-checks'] });
      void queryClient.invalidateQueries({ queryKey: ['automation-health'] });
    },
    onError: (error) => {
      setStatusMessage(getErrorMessage(error, 'Unable to evaluate policies.'));
    },
  });

  const submitAccessToken = () => {
    const nextToken = draftAccessToken.trim();

    if (nextToken.length === 0) {
      setTokenError('Provide a bearer token to load the health dashboard.');
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, nextToken);
    setAccessToken(nextToken);
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
    void queryClient.removeQueries({ queryKey: ['automation-health'] });
    void queryClient.removeQueries({ queryKey: ['policy-checks'] });
  };

  const selectedHealth =
    healthScores.find((health) => health.repositoryId === selectedRepositoryId) ?? null;
  const policyChecks = policyChecksQuery.data ?? EMPTY_POLICY_CHECKS;

  return (
    <div className="page-stack">
      <section className="page-header">
        <span className="page-header__eyebrow">Automation health</span>
        <h2 className="page-header__title">
          Measure how governed each repository actually is.
        </h2>
        <p className="page-header__description">
          The health score combines policy signals, CI reliability over the latest runs, and
          open review blockers into a single 0-100 value computed by ForgeOps on demand.
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
            The token is stored only in this browser session so the frontend can call the
            protected backend endpoints while the dedicated auth flow is still pending.
          </p>
        </div>
      </Card>

      {statusMessage ? (
        <div className="status-banner" role="status">
          {statusMessage}
        </div>
      ) : null}

      <Card eyebrow="Overview" title="Repository health scores">
        {!hasAccessToken ? (
          <p className="empty-state">
            Add an operator token to compute the health score of every monitored repository.
          </p>
        ) : overviewQuery.isLoading ? (
          <p className="empty-state">Computing repository health scores...</p>
        ) : overviewQuery.isError ? (
          <p className="empty-state">
            {getErrorMessage(overviewQuery.error, 'Unable to load automation health.')}
          </p>
        ) : healthScores.length === 0 ? (
          <p className="empty-state">
            No repositories are monitored yet. Connect one in the Repositories page to see its
            health here.
          </p>
        ) : (
          <div className="health-dashboard">
            {healthScores.map((health) => (
              <HealthScoreCard
                key={health.repositoryId}
                health={health}
                isSelected={health.repositoryId === selectedRepositoryId}
                onSelect={setSelectedRepositoryId}
              />
            ))}
          </div>
        )}
      </Card>

      {selectedHealth ? (
        <Card eyebrow="Policies" title={`Policy checks for ${selectedHealth.fullName}`}>
          {policyChecksQuery.isLoading ? (
            <p className="empty-state">Loading policy checks...</p>
          ) : policyChecksQuery.isError ? (
            <p className="empty-state">
              {getErrorMessage(policyChecksQuery.error, 'Unable to load policy checks.')}
            </p>
          ) : (
            <PolicyChecksPanel
              policyChecks={policyChecks}
              isEvaluating={evaluatePoliciesMutation.isPending}
              onEvaluate={() => evaluatePoliciesMutation.mutate()}
            />
          )}
        </Card>
      ) : null}
    </div>
  );
}
