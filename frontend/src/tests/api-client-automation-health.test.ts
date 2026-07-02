import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, createApiClient } from '@/lib/api/client';

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const buildHealthPayload = () => ({
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
});

describe('createApiClient automation health and governance methods', () => {
  it('should fetch the automation health overview with operator authorization', async () => {
    const healthPayload = buildHealthPayload();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ repositories: [healthPayload] }));
    const client = createApiClient({ baseUrl: 'http://localhost:3333', fetcher });

    await expect(client.getAutomationHealthOverview('trusted-token')).resolves.toEqual([
      healthPayload,
    ]);
    expect(fetcher).toHaveBeenCalledWith('http://localhost:3333/api/v1/automation-health', {
      headers: {
        accept: 'application/json',
        authorization: 'Bearer trusted-token',
      },
    });
  });

  it('should reject automation health payloads that break the contract', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ repositories: [{ repositoryId: 'repo_123', score: 200 }] }),
      );
    const client = createApiClient({ baseUrl: 'http://localhost:3333', fetcher });

    await expect(
      client.getAutomationHealthOverview('trusted-token'),
    ).rejects.toThrowError();
  });

  it('should fetch the automation health detail of a repository', async () => {
    const healthPayload = buildHealthPayload();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ health: healthPayload }));
    const client = createApiClient({ baseUrl: 'http://localhost:3333', fetcher });

    await expect(
      client.getRepositoryAutomationHealth('trusted-token', 'repo_123'),
    ).resolves.toEqual(healthPayload);
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/repositories/repo_123/automation-health',
      {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
        },
      },
    );
  });

  it('should fetch and evaluate repository policy checks', async () => {
    const policyCheckPayload = {
      id: 'policy_1',
      repositoryId: 'repo_123',
      policyKey: 'lint_workflow_present',
      status: 'non_compliant',
      details: "No active workflow with 'lint' in its name or path.",
      checkedAt: '2026-07-01T10:00:00.000Z',
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        jsonResponse({ policyChecks: [policyCheckPayload] }),
      );
    const client = createApiClient({ baseUrl: 'http://localhost:3333', fetcher });

    await expect(
      client.getRepositoryPolicyChecks('trusted-token', 'repo_123'),
    ).resolves.toEqual([policyCheckPayload]);
    expect(fetcher).toHaveBeenLastCalledWith(
      'http://localhost:3333/api/v1/repositories/repo_123/policy-checks',
      {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
        },
      },
    );

    await expect(
      client.evaluateRepositoryPolicyChecks('trusted-token', 'repo_123'),
    ).resolves.toEqual([policyCheckPayload]);
    expect(fetcher).toHaveBeenLastCalledWith(
      'http://localhost:3333/api/v1/repositories/repo_123/policy-checks/evaluate',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
        },
      },
    );
  });

  it('should propagate structured errors when policy evaluation fails', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'repository_not_found',
            message: 'Repository was not found.',
          },
        },
        404,
      ),
    );
    const client = createApiClient({ baseUrl: 'http://localhost:3333', fetcher });

    await expect(
      client.evaluateRepositoryPolicyChecks('trusted-token', 'repo_missing'),
    ).rejects.toEqual(
      new ApiClientError('Repository was not found.', 404, 'repository_not_found'),
    );
  });

  it('should fetch repository review insights including a null lastReviewedAt', async () => {
    const insightsPayload = {
      repositoryId: 'repo_123',
      openPullRequestCount: 0,
      reviewedPullRequestCount: 0,
      openBlockersCount: 0,
      totalBlockersCount: 0,
      totalRisksCount: 0,
      totalSuggestionsCount: 0,
      lastReviewedAt: null,
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ insights: insightsPayload }));
    const client = createApiClient({ baseUrl: 'http://localhost:3333', fetcher });

    await expect(
      client.getRepositoryReviewInsights('trusted-token', 'repo_123'),
    ).resolves.toEqual(insightsPayload);
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/repositories/repo_123/review-insights',
      {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
        },
      },
    );
  });

  it('should fetch repository sync events', async () => {
    const syncEventPayload = {
      id: 'sync_1',
      repositoryId: 'repo_123',
      type: 'workflow_catalog_sync',
      status: 'succeeded',
      details: '2 workflow(s) sincronizado(s).',
      createdAt: '2026-07-01T08:00:00.000Z',
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ syncEvents: [syncEventPayload] }));
    const client = createApiClient({ baseUrl: 'http://localhost:3333', fetcher });

    await expect(
      client.getRepositorySyncEvents('trusted-token', 'repo_123'),
    ).resolves.toEqual([syncEventPayload]);
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/repositories/repo_123/sync-events',
      {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
        },
      },
    );
  });
});
