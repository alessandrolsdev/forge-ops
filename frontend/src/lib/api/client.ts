import { z } from 'zod';
import { getApiBaseUrl } from '../config/public-env';

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('forgeops-backend'),
  timestamp: z.string().datetime(),
  environment: z.enum(['development', 'test', 'production']),
  integrations: z.object({
    github: z.object({
      mode: z.literal('github-app'),
      configured: z.boolean(),
      appId: z.string().nullable(),
      installationId: z.string().nullable(),
      webhookConfigured: z.boolean(),
    }),
  }),
});

export type BackendHealthResponse = z.infer<typeof healthResponseSchema>;

const monitoredRepositorySchema = z.object({
  id: z.string().min(1),
  githubRepoId: z.string().min(1),
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
  defaultBranch: z.string().min(1),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const monitoredRepositoriesResponseSchema = z.object({
  repositories: z.array(monitoredRepositorySchema),
});

const repositoryDiscoveryItemSchema = z.object({
  githubRepoId: z.string().min(1),
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
  defaultBranch: z.string().min(1),
  isPrivate: z.boolean(),
});

const repositoryDiscoveryResponseSchema = z.object({
  repositories: z.array(repositoryDiscoveryItemSchema),
});

const createRepositoryInputSchema = z.object({
  githubRepoId: z.string().min(1),
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
  defaultBranch: z.string().min(1),
  isActive: z.boolean().optional(),
});

const createRepositoryResponseSchema = z.object({
  repository: monitoredRepositorySchema,
});

const workflowCatalogItemSchema = z.object({
  id: z.string().min(1),
  repositoryId: z.string().min(1),
  githubWorkflowId: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  state: z.enum([
    'active',
    'deleted',
    'disabled_fork',
    'disabled_inactivity',
    'disabled_manually',
  ]),
  sourceType: z.enum(['local', 'reusable']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const workflowCatalogResponseSchema = z.object({
  workflows: z.array(workflowCatalogItemSchema),
});

const pullRequestItemSchema = z.object({
  id: z.string().min(1),
  githubPrId: z.string().min(1),
  number: z.number().int().nonnegative(),
  title: z.string().min(1),
  state: z.enum(['open', 'closed', 'merged']),
  author: z.string().min(1),
  baseBranch: z.string().min(1),
  headBranch: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const pullRequestsResponseSchema = z.object({
  pullRequests: z.array(pullRequestItemSchema),
});

const pullRequestDetailResponseSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().nonnegative(),
  title: z.string().min(1),
  status: z.enum(['open', 'closed', 'merged']),
  author: z.string().min(1),
  summary: z
    .object({
      blockersCount: z.number().int().nonnegative(),
      risksCount: z.number().int().nonnegative(),
      suggestionsCount: z.number().int().nonnegative(),
      lastReviewedAt: z.string().datetime(),
    })
    .nullable(),
  workflows: z.array(
    z.object({
      name: z.string().min(1),
      status: z.enum(['queued', 'in_progress', 'completed', 'pending', 'waiting', 'requested']),
      conclusion: z
        .enum([
          'success',
          'failure',
          'neutral',
          'cancelled',
          'skipped',
          'timed_out',
          'action_required',
          'stale',
          'startup_failure',
        ])
        .nullable(),
      startedAt: z.string().datetime().nullable(),
      finishedAt: z.string().datetime().nullable(),
    }),
  ),
});

const requestPullRequestCodexReviewResponseSchema = z.object({
  pullRequestId: z.string().min(1),
  pullRequestNumber: z.number().int().positive(),
  label: z.literal('codex-review'),
  status: z.literal('requested'),
});

const workflowRunItemSchema = z.object({
  id: z.string().min(1),
  workflowId: z.string().min(1),
  githubRunId: z.string().min(1),
  status: z.enum(['queued', 'in_progress', 'completed', 'pending', 'waiting', 'requested']),
  conclusion: z
    .enum([
      'success',
      'failure',
      'neutral',
      'cancelled',
      'skipped',
      'timed_out',
      'action_required',
      'stale',
      'startup_failure',
    ])
    .nullable(),
  branch: z.string().min(1),
  sha: z.string().min(1),
  event: z.string().min(1),
  startedAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const workflowRunsResponseSchema = z.object({
  runs: z.array(workflowRunItemSchema),
});

const workflowRunJobItemSchema = z.object({
  id: z.string().min(1),
  workflowRunId: z.string().min(1),
  githubJobId: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['queued', 'in_progress', 'completed', 'pending', 'waiting', 'requested']),
  conclusion: z
    .enum([
      'success',
      'failure',
      'neutral',
      'cancelled',
      'skipped',
      'timed_out',
      'action_required',
      'stale',
      'startup_failure',
    ])
    .nullable(),
  startedAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const workflowRunDetailResponseSchema = z.object({
  run: workflowRunItemSchema,
  jobs: z.array(workflowRunJobItemSchema),
});

const policyKeySchema = z.enum([
  'ci_workflow_present',
  'lint_workflow_present',
  'test_workflow_present',
  'automated_review_present',
  'reusable_workflow_present',
  'security_workflow_present',
]);

const policyCheckStatusSchema = z.enum(['compliant', 'non_compliant']);

const automationHealthSignalSchema = z.object({
  policyKey: policyKeySchema,
  status: policyCheckStatusSchema,
  weight: z.number().int().nonnegative(),
  earnedPoints: z.number().int().nonnegative(),
  details: z.string().min(1),
});

const automationHealthScoreSchema = z.object({
  repositoryId: z.string().min(1),
  fullName: z.string().min(1),
  score: z.number().int().min(0).max(100),
  grade: z.enum(['healthy', 'attention', 'critical']),
  signals: z.array(automationHealthSignalSchema),
  ciReliability: z.object({
    weight: z.number().int().nonnegative(),
    earnedPoints: z.number().int().nonnegative(),
    consideredRunCount: z.number().int().nonnegative(),
    successfulRunCount: z.number().int().nonnegative(),
  }),
  blockersPenalty: z.object({
    openBlockersCount: z.number().int().nonnegative(),
    penaltyPoints: z.number().int().nonnegative(),
  }),
  computedAt: z.string().datetime(),
});

const automationHealthOverviewResponseSchema = z.object({
  repositories: z.array(automationHealthScoreSchema),
});

const repositoryAutomationHealthResponseSchema = z.object({
  health: automationHealthScoreSchema,
});

const policyCheckItemSchema = z.object({
  id: z.string().min(1),
  repositoryId: z.string().min(1),
  policyKey: policyKeySchema,
  status: policyCheckStatusSchema,
  details: z.string().min(1),
  checkedAt: z.string().datetime(),
});

const policyChecksResponseSchema = z.object({
  policyChecks: z.array(policyCheckItemSchema),
});

const reviewInsightsResponseSchema = z.object({
  insights: z.object({
    repositoryId: z.string().min(1),
    openPullRequestCount: z.number().int().nonnegative(),
    reviewedPullRequestCount: z.number().int().nonnegative(),
    openBlockersCount: z.number().int().nonnegative(),
    totalBlockersCount: z.number().int().nonnegative(),
    totalRisksCount: z.number().int().nonnegative(),
    totalSuggestionsCount: z.number().int().nonnegative(),
    lastReviewedAt: z.string().datetime().nullable(),
  }),
});

const syncEventItemSchema = z.object({
  id: z.string().min(1),
  repositoryId: z.string().min(1),
  type: z.enum([
    'repository_connected',
    'workflow_catalog_sync',
    'workflow_runs_sync',
    'pull_requests_sync',
    'codex_review_sync',
    'policy_evaluation',
  ]),
  status: z.enum(['succeeded', 'failed']),
  details: z.string().min(1),
  createdAt: z.string().datetime(),
});

const syncEventsResponseSchema = z.object({
  syncEvents: z.array(syncEventItemSchema),
});

export type MonitoredRepository = z.infer<typeof monitoredRepositorySchema>;
export type RepositoryDiscoveryItem = z.infer<typeof repositoryDiscoveryItemSchema>;
export type CreateRepositoryInput = z.infer<typeof createRepositoryInputSchema>;
export type WorkflowCatalogItem = z.infer<typeof workflowCatalogItemSchema>;
export type PullRequestItem = z.infer<typeof pullRequestItemSchema>;
export type PullRequestDetailResponse = z.infer<typeof pullRequestDetailResponseSchema>;
export type PullRequestCodexReviewRequestResponse = z.infer<
  typeof requestPullRequestCodexReviewResponseSchema
>;
export type WorkflowRunItem = z.infer<typeof workflowRunItemSchema>;
export type WorkflowRunJobItem = z.infer<typeof workflowRunJobItemSchema>;
export type WorkflowRunDetailResponse = z.infer<typeof workflowRunDetailResponseSchema>;
export type AutomationHealthScore = z.infer<typeof automationHealthScoreSchema>;
export type AutomationHealthSignal = z.infer<typeof automationHealthSignalSchema>;
export type PolicyCheckItem = z.infer<typeof policyCheckItemSchema>;
export type ReviewInsights = z.infer<typeof reviewInsightsResponseSchema>['insights'];
export type SyncEventItem = z.infer<typeof syncEventItemSchema>;

interface CreateApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null = null,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

export interface ForgeOpsApiClient {
  getHealth(): Promise<BackendHealthResponse>;
  getRepositories(accessToken: string): Promise<MonitoredRepository[]>;
  getRepositoryDiscovery(accessToken: string): Promise<RepositoryDiscoveryItem[]>;
  getRepositoryWorkflows(
    accessToken: string,
    repositoryId: string,
  ): Promise<WorkflowCatalogItem[]>;
  getPullRequests(accessToken: string, repositoryId: string): Promise<PullRequestItem[]>;
  getPullRequestDetail(
    accessToken: string,
    repositoryId: string,
    pullRequestId: string,
  ): Promise<PullRequestDetailResponse>;
  requestPullRequestCodexReview(
    accessToken: string,
    repositoryId: string,
    pullRequestId: string,
  ): Promise<PullRequestCodexReviewRequestResponse>;
  getWorkflowRuns(
    accessToken: string,
    repositoryId: string,
    workflowId: string,
  ): Promise<WorkflowRunItem[]>;
  getWorkflowRunDetail(
    accessToken: string,
    repositoryId: string,
    workflowId: string,
    workflowRunId: string,
  ): Promise<WorkflowRunDetailResponse>;
  createRepository(
    accessToken: string,
    input: CreateRepositoryInput,
  ): Promise<MonitoredRepository>;
  getAutomationHealthOverview(accessToken: string): Promise<AutomationHealthScore[]>;
  getRepositoryAutomationHealth(
    accessToken: string,
    repositoryId: string,
  ): Promise<AutomationHealthScore>;
  getRepositoryPolicyChecks(
    accessToken: string,
    repositoryId: string,
  ): Promise<PolicyCheckItem[]>;
  evaluateRepositoryPolicyChecks(
    accessToken: string,
    repositoryId: string,
  ): Promise<PolicyCheckItem[]>;
  getRepositoryReviewInsights(
    accessToken: string,
    repositoryId: string,
  ): Promise<ReviewInsights>;
  getRepositorySyncEvents(
    accessToken: string,
    repositoryId: string,
  ): Promise<SyncEventItem[]>;
}

const createApiError = async (response: Response, fallbackMessage: string) => {
  try {
    const payload = apiErrorSchema.parse(await response.json());
    return new ApiClientError(payload.error.message, response.status, payload.error.code);
  } catch {
    return new ApiClientError(fallbackMessage, response.status);
  }
};

export const createApiClient = (options: CreateApiClientOptions = {}): ForgeOpsApiClient => {
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? getApiBaseUrl());
  const buildHeaders = (accessToken?: string, contentType?: string) => ({
    accept: 'application/json',
    ...(contentType ? { 'content-type': contentType } : {}),
    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
  });

  return {
    async getHealth(): Promise<BackendHealthResponse> {
      const response = await fetcher(`${baseUrl}/api/v1/health`, {
        headers: {
          accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch backend health (${response.status})`);
      }

      return healthResponseSchema.parse(await response.json());
    },

    async getRepositories(accessToken: string): Promise<MonitoredRepository[]> {
      const response = await fetcher(`${baseUrl}/api/v1/repositories`, {
        headers: buildHeaders(accessToken),
      });

      if (!response.ok) {
        throw await createApiError(response, `Failed to fetch repositories (${response.status})`);
      }

      return monitoredRepositoriesResponseSchema.parse(await response.json()).repositories;
    },

    async getRepositoryDiscovery(accessToken: string): Promise<RepositoryDiscoveryItem[]> {
      const response = await fetcher(`${baseUrl}/api/v1/repositories/discovery`, {
        headers: buildHeaders(accessToken),
      });

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to fetch repository discovery (${response.status})`,
        );
      }

      return repositoryDiscoveryResponseSchema.parse(await response.json()).repositories;
    },

    async getRepositoryWorkflows(
      accessToken: string,
      repositoryId: string,
    ): Promise<WorkflowCatalogItem[]> {
      const response = await fetcher(
        `${baseUrl}/api/v1/repositories/${repositoryId}/workflows`,
        {
          headers: buildHeaders(accessToken),
        },
      );

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to fetch repository workflows (${response.status})`,
        );
      }

      return workflowCatalogResponseSchema.parse(await response.json()).workflows;
    },

    async getPullRequests(
      accessToken: string,
      repositoryId: string,
    ): Promise<PullRequestItem[]> {
      const response = await fetcher(
        `${baseUrl}/api/v1/repositories/${repositoryId}/pull-requests`,
        {
          headers: buildHeaders(accessToken),
        },
      );

      if (!response.ok) {
        throw await createApiError(response, `Failed to fetch pull requests (${response.status})`);
      }

      return pullRequestsResponseSchema.parse(await response.json()).pullRequests;
    },

    async getPullRequestDetail(
      accessToken: string,
      repositoryId: string,
      pullRequestId: string,
    ): Promise<PullRequestDetailResponse> {
      const response = await fetcher(
        `${baseUrl}/api/v1/repositories/${repositoryId}/pull-requests/${pullRequestId}`,
        {
          headers: buildHeaders(accessToken),
        },
      );

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to fetch pull request detail (${response.status})`,
        );
      }

      return pullRequestDetailResponseSchema.parse(await response.json());
    },

    async requestPullRequestCodexReview(
      accessToken: string,
      repositoryId: string,
      pullRequestId: string,
    ): Promise<PullRequestCodexReviewRequestResponse> {
      const response = await fetcher(
        `${baseUrl}/api/v1/repositories/${repositoryId}/pull-requests/${pullRequestId}/codex-review-request`,
        {
          method: 'POST',
          headers: buildHeaders(accessToken),
        },
      );

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to request Codex review (${response.status})`,
        );
      }

      return requestPullRequestCodexReviewResponseSchema.parse(await response.json());
    },

    async getWorkflowRuns(
      accessToken: string,
      repositoryId: string,
      workflowId: string,
    ): Promise<WorkflowRunItem[]> {
      const response = await fetcher(
        `${baseUrl}/api/v1/repositories/${repositoryId}/workflows/${workflowId}/runs`,
        {
          headers: buildHeaders(accessToken),
        },
      );

      if (!response.ok) {
        throw await createApiError(response, `Failed to fetch workflow runs (${response.status})`);
      }

      return workflowRunsResponseSchema.parse(await response.json()).runs;
    },

    async getWorkflowRunDetail(
      accessToken: string,
      repositoryId: string,
      workflowId: string,
      workflowRunId: string,
    ): Promise<WorkflowRunDetailResponse> {
      const response = await fetcher(
        `${baseUrl}/api/v1/repositories/${repositoryId}/workflows/${workflowId}/runs/${workflowRunId}`,
        {
          headers: buildHeaders(accessToken),
        },
      );

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to fetch workflow run detail (${response.status})`,
        );
      }

      return workflowRunDetailResponseSchema.parse(await response.json());
    },

    async createRepository(
      accessToken: string,
      input: CreateRepositoryInput,
    ): Promise<MonitoredRepository> {
      const payload = createRepositoryInputSchema.parse(input);
      const response = await fetcher(`${baseUrl}/api/v1/repositories`, {
        method: 'POST',
        headers: buildHeaders(accessToken, 'application/json'),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw await createApiError(response, `Failed to create repository (${response.status})`);
      }

      return createRepositoryResponseSchema.parse(await response.json()).repository;
    },

    async getAutomationHealthOverview(
      accessToken: string,
    ): Promise<AutomationHealthScore[]> {
      const response = await fetcher(`${baseUrl}/api/v1/automation-health`, {
        headers: buildHeaders(accessToken),
      });

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to fetch automation health overview (${response.status})`,
        );
      }

      return automationHealthOverviewResponseSchema.parse(await response.json()).repositories;
    },

    async getRepositoryAutomationHealth(
      accessToken: string,
      repositoryId: string,
    ): Promise<AutomationHealthScore> {
      const response = await fetcher(
        `${baseUrl}/api/v1/repositories/${repositoryId}/automation-health`,
        {
          headers: buildHeaders(accessToken),
        },
      );

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to fetch repository automation health (${response.status})`,
        );
      }

      return repositoryAutomationHealthResponseSchema.parse(await response.json()).health;
    },

    async getRepositoryPolicyChecks(
      accessToken: string,
      repositoryId: string,
    ): Promise<PolicyCheckItem[]> {
      const response = await fetcher(
        `${baseUrl}/api/v1/repositories/${repositoryId}/policy-checks`,
        {
          headers: buildHeaders(accessToken),
        },
      );

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to fetch policy checks (${response.status})`,
        );
      }

      return policyChecksResponseSchema.parse(await response.json()).policyChecks;
    },

    async evaluateRepositoryPolicyChecks(
      accessToken: string,
      repositoryId: string,
    ): Promise<PolicyCheckItem[]> {
      const response = await fetcher(
        `${baseUrl}/api/v1/repositories/${repositoryId}/policy-checks/evaluate`,
        {
          method: 'POST',
          headers: buildHeaders(accessToken),
        },
      );

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to evaluate policy checks (${response.status})`,
        );
      }

      return policyChecksResponseSchema.parse(await response.json()).policyChecks;
    },

    async getRepositoryReviewInsights(
      accessToken: string,
      repositoryId: string,
    ): Promise<ReviewInsights> {
      const response = await fetcher(
        `${baseUrl}/api/v1/repositories/${repositoryId}/review-insights`,
        {
          headers: buildHeaders(accessToken),
        },
      );

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to fetch review insights (${response.status})`,
        );
      }

      return reviewInsightsResponseSchema.parse(await response.json()).insights;
    },

    async getRepositorySyncEvents(
      accessToken: string,
      repositoryId: string,
    ): Promise<SyncEventItem[]> {
      const response = await fetcher(
        `${baseUrl}/api/v1/repositories/${repositoryId}/sync-events`,
        {
          headers: buildHeaders(accessToken),
        },
      );

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to fetch sync events (${response.status})`,
        );
      }

      return syncEventsResponseSchema.parse(await response.json()).syncEvents;
    },
  };
};

