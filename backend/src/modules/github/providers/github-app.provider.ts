import { createPrivateKey, sign } from 'node:crypto';
import { z } from 'zod';
import type {
  GitHubAppBoundary,
  GitHubInstallationRepository,
  GitHubAppStatus,
  GitHubPullRequestDescriptor,
  GitHubRepositoryDescriptor,
  GitHubWorkflowDescriptor,
  GitHubWorkflowJobDescriptor,
  GitHubWorkflowRunDescriptor,
} from '../github-app.boundary.js';
import type { GitHubAppEnv } from '../../../infra/config/github-app-env.js';
import { ConfigurationError } from '../../../shared/errors/configuration-error.js';
import {
  GitHubRepositoryDiscoveryError,
  GitHubPullRequestSyncError,
  GitHubWorkflowCatalogSyncError,
  GitHubWorkflowRunsSyncError,
} from '../github-app.errors.js';
import type {
  WorkflowExecutionConclusion,
  WorkflowExecutionStatus,
} from '../../workflow-runs/workflow-run.entity.js';

const githubInstallationAccessTokenSchema = z.object({
  token: z.string().trim().min(1),
});

const githubInstallationRepositoriesSchema = z.object({
  repositories: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      name: z.string().trim().min(1),
      full_name: z.string().trim().min(1),
      private: z.boolean(),
      default_branch: z.string().trim().min(1),
      owner: z.object({
        login: z.string().trim().min(1),
      }),
    }),
  ),
});

const githubRepositoryWorkflowsSchema = z.object({
  workflows: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      name: z.string().trim().min(1),
      path: z.string().trim().min(1),
      state: z.enum([
        'active',
        'deleted',
        'disabled_fork',
        'disabled_inactivity',
        'disabled_manually',
      ]),
    }),
  ),
});

const githubWorkflowRunsSchema = z.object({
  workflow_runs: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      status: z.string().trim().min(1),
      conclusion: z.string().trim().min(1).nullable(),
      head_branch: z.string().trim().min(1),
      head_sha: z.string().trim().min(1),
      event: z.string().trim().min(1),
      run_started_at: z.string().trim().min(1).nullable(),
      updated_at: z.string().trim().min(1),
    }),
  ),
});

const githubWorkflowRunJobsSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.number().int().nonnegative(),
      name: z.string().trim().min(1),
      status: z.string().trim().min(1),
      conclusion: z.string().trim().min(1).nullable(),
      started_at: z.string().trim().min(1).nullable(),
      completed_at: z.string().trim().min(1).nullable(),
    }),
  ),
});

const githubPullRequestsSchema = z.array(
  z.object({
    id: z.number().int().nonnegative(),
    number: z.number().int().positive(),
    title: z.string().trim().min(1),
    state: z.enum(['open', 'closed']),
    merged_at: z.string().trim().min(1).nullable(),
    user: z
      .object({
        login: z.string().trim().min(1),
      })
      .nullable(),
    base: z.object({
      ref: z.string().trim().min(1),
    }),
    head: z.object({
      ref: z.string().trim().min(1),
    }),
  }),
);

const GITHUB_API_VERSION = '2022-11-28';
const DEFAULT_GITHUB_API_BASE_URL = 'https://api.github.com';
const DEFAULT_TIMEOUT_MS = 5000;

export interface GitHubAppProviderOptions {
  apiBaseUrl?: string;
  fetchImplementation?: typeof fetch;
  now?: () => Date;
  appJwtFactory?: (config: GitHubAppEnv, now: Date) => string;
}

const maskIdentifier = (value: string): string => {
  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }

  return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`;
};

export class GitHubAppProvider implements GitHubAppBoundary {
  public readonly mode = 'github-app' as const;
  public readonly configured: boolean;

  private readonly config: GitHubAppEnv | null;
  private readonly apiBaseUrl: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly now: () => Date;
  private readonly appJwtFactory: (config: GitHubAppEnv, now: Date) => string;

  public constructor(
    config: GitHubAppEnv | null,
    options: GitHubAppProviderOptions = {},
  ) {
    this.config = config;
    this.configured = config !== null;
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_GITHUB_API_BASE_URL;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.appJwtFactory = options.appJwtFactory ?? createGitHubAppJwt;
  }

  public getStatus(): GitHubAppStatus {
    return {
      mode: this.mode,
      configured: this.configured,
      appId: this.config ? maskIdentifier(this.config.GITHUB_APP_ID) : null,
      installationId: this.config
        ? maskIdentifier(this.config.GITHUB_APP_INSTALLATION_ID)
        : null,
      webhookConfigured: this.config !== null,
    };
  }

  public assertConfigured(): void {
    if (this.config === null) {
      throw new ConfigurationError(
        'GitHub App configuration is required before using the integration boundary.',
        'github_app_not_configured',
      );
    }
  }

  public async listInstallationRepositories(): Promise<GitHubInstallationRepository[]> {
    this.assertConfigured();

    try {
      const installationToken = await this.createInstallationAccessToken();
      const payload = await this.requestJson(
        `${this.apiBaseUrl}/installation/repositories?per_page=100`,
        {
          method: 'GET',
          headers: this.createJsonHeaders(`Bearer ${installationToken}`),
        },
        githubInstallationRepositoriesSchema,
      );

      return payload.repositories.map((repository) => ({
        githubRepoId: String(repository.id),
        owner: repository.owner.login,
        name: repository.name,
        fullName: repository.full_name,
        defaultBranch: repository.default_branch,
        isPrivate: repository.private,
      }));
    } catch (error) {
      if (
        error instanceof ConfigurationError ||
        error instanceof GitHubRepositoryDiscoveryError
      ) {
        throw error;
      }

      throw new GitHubRepositoryDiscoveryError();
    }
  }

  public async listRepositoryWorkflows(
    repository: GitHubRepositoryDescriptor,
  ): Promise<GitHubWorkflowDescriptor[]> {
    this.assertConfigured();

    try {
      const installationToken = await this.createInstallationAccessToken();
      const payload = await this.requestJson(
        `${this.apiBaseUrl}/repos/${repository.owner}/${repository.name}/actions/workflows?per_page=100`,
        {
          method: 'GET',
          headers: this.createJsonHeaders(`Bearer ${installationToken}`),
        },
        githubRepositoryWorkflowsSchema,
      );

      return payload.workflows.map((workflow) => ({
        githubWorkflowId: String(workflow.id),
        name: workflow.name,
        path: workflow.path,
        state: workflow.state,
        sourceType: 'local',
      }));
    } catch (error) {
      if (
        error instanceof ConfigurationError ||
        error instanceof GitHubWorkflowCatalogSyncError
      ) {
        throw error;
      }

      throw new GitHubWorkflowCatalogSyncError();
    }
  }

  public async listWorkflowRuns(
    repository: GitHubRepositoryDescriptor,
    workflowId: string,
  ): Promise<GitHubWorkflowRunDescriptor[]> {
    this.assertConfigured();

    try {
      const installationToken = await this.createInstallationAccessToken();
      const payload = await this.requestJson(
        `${this.apiBaseUrl}/repos/${repository.owner}/${repository.name}/actions/workflows/${workflowId}/runs?per_page=20`,
        {
          method: 'GET',
          headers: this.createJsonHeaders(`Bearer ${installationToken}`),
        },
        githubWorkflowRunsSchema,
      );

      return payload.workflow_runs.map((workflowRun) =>
        mapGitHubWorkflowRunDescriptor(workflowRun),
      );
    } catch (error) {
      if (
        error instanceof ConfigurationError ||
        error instanceof GitHubWorkflowRunsSyncError
      ) {
        throw error;
      }

      throw new GitHubWorkflowRunsSyncError();
    }
  }

  public async listWorkflowRunJobs(
    repository: GitHubRepositoryDescriptor,
    workflowRunId: string,
  ): Promise<GitHubWorkflowJobDescriptor[]> {
    this.assertConfigured();

    try {
      const installationToken = await this.createInstallationAccessToken();
      const payload = await this.requestJson(
        `${this.apiBaseUrl}/repos/${repository.owner}/${repository.name}/actions/runs/${workflowRunId}/jobs?per_page=100`,
        {
          method: 'GET',
          headers: this.createJsonHeaders(`Bearer ${installationToken}`),
        },
        githubWorkflowRunJobsSchema,
      );

      return payload.jobs.map((job) => mapGitHubWorkflowJobDescriptor(job));
    } catch (error) {
      if (
        error instanceof ConfigurationError ||
        error instanceof GitHubWorkflowRunsSyncError
      ) {
        throw error;
      }

      throw new GitHubWorkflowRunsSyncError();
    }
  }

  public async listPullRequests(
    repository: GitHubRepositoryDescriptor,
  ): Promise<GitHubPullRequestDescriptor[]> {
    this.assertConfigured();

    try {
      const installationToken = await this.createInstallationAccessToken();
      const payload = await this.requestJson(
        `${this.apiBaseUrl}/repos/${repository.owner}/${repository.name}/pulls?state=all&per_page=100&sort=updated&direction=desc`,
        {
          method: 'GET',
          headers: this.createJsonHeaders(`Bearer ${installationToken}`),
        },
        githubPullRequestsSchema,
      );

      return payload.map((pullRequest) => mapGitHubPullRequestDescriptor(pullRequest));
    } catch (error) {
      if (
        error instanceof ConfigurationError ||
        error instanceof GitHubPullRequestSyncError
      ) {
        throw error;
      }

      throw new GitHubPullRequestSyncError();
    }
  }

  private async createInstallationAccessToken(): Promise<string> {
    const config = this.config;

    if (config === null) {
      throw new ConfigurationError(
        'GitHub App configuration is required before using the integration boundary.',
        'github_app_not_configured',
      );
    }

    const jwt = this.appJwtFactory(config, this.now());
    const payload = await this.requestJson(
      `${this.apiBaseUrl}/app/installations/${config.GITHUB_APP_INSTALLATION_ID}/access_tokens`,
      {
        method: 'POST',
        headers: this.createJsonHeaders(`Bearer ${jwt}`),
      },
      githubInstallationAccessTokenSchema,
    );

    return payload.token;
  }

  private createJsonHeaders(authorization: string): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: authorization,
      'User-Agent': 'ForgeOps',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    };
  }

  private async requestJson<T>(
    input: string,
    init: RequestInit,
    schema: z.ZodSchema<T>,
  ): Promise<T> {
    const response = await this.fetchImplementation(input, {
      ...init,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`GitHub request failed with status ${response.status}.`);
    }

    const payload: unknown = await response.json();
    return schema.parse(payload);
  }
}

const normalizePrivateKey = (value: string): string =>
  value.replace(/\\n/g, '\n');

const encodeBase64Url = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url');

const createGitHubAppJwt = (config: GitHubAppEnv, now: Date): string => {
  const issuedAt = Math.floor(now.getTime() / 1000) - 60;
  const expiresAt = issuedAt + 9 * 60;
  const header = encodeBase64Url(
    JSON.stringify({
      alg: 'RS256',
      typ: 'JWT',
    }),
  );
  const payload = encodeBase64Url(
    JSON.stringify({
      iat: issuedAt,
      exp: expiresAt,
      iss: config.GITHUB_APP_ID,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = sign(
    'RSA-SHA256',
    Buffer.from(signingInput),
    createPrivateKey(normalizePrivateKey(config.GITHUB_APP_PRIVATE_KEY)),
  ).toString('base64url');

  return `${signingInput}.${signature}`;
};

const mapGitHubWorkflowRunDescriptor = (
  workflowRun: z.infer<typeof githubWorkflowRunsSchema>['workflow_runs'][number],
): GitHubWorkflowRunDescriptor => {
  const status = mapWorkflowExecutionStatus(workflowRun.status);
  const startedAt = parseGitHubDate(workflowRun.run_started_at);
  const finishedAt =
    status === 'completed' ? parseGitHubDate(workflowRun.updated_at) : null;

  return {
    githubRunId: String(workflowRun.id),
    status,
    conclusion: mapWorkflowExecutionConclusion(workflowRun.conclusion),
    branch: workflowRun.head_branch,
    sha: workflowRun.head_sha,
    event: workflowRun.event,
    startedAt,
    finishedAt,
    durationMs: calculateDurationMs(startedAt, finishedAt),
  };
};

const mapGitHubWorkflowJobDescriptor = (
  workflowJob: z.infer<typeof githubWorkflowRunJobsSchema>['jobs'][number],
): GitHubWorkflowJobDescriptor => {
  return {
    githubJobId: String(workflowJob.id),
    name: workflowJob.name,
    status: mapWorkflowExecutionStatus(workflowJob.status),
    conclusion: mapWorkflowExecutionConclusion(workflowJob.conclusion),
    startedAt: parseGitHubDate(workflowJob.started_at),
    finishedAt: parseGitHubDate(workflowJob.completed_at),
  };
};

const mapGitHubPullRequestDescriptor = (
  pullRequest: z.infer<typeof githubPullRequestsSchema>[number],
): GitHubPullRequestDescriptor => {
  return {
    githubPrId: String(pullRequest.id),
    number: pullRequest.number,
    title: pullRequest.title,
    state: mapPullRequestState(pullRequest.state, pullRequest.merged_at),
    author: pullRequest.user?.login ?? 'unknown',
    baseBranch: pullRequest.base.ref,
    headBranch: pullRequest.head.ref,
  };
};

const mapPullRequestState = (
  state: 'open' | 'closed',
  mergedAt: string | null,
): GitHubPullRequestDescriptor['state'] => {
  if (state === 'open') {
    return 'open';
  }

  return mergedAt ? 'merged' : 'closed';
};

const mapWorkflowExecutionStatus = (
  value: string,
): WorkflowExecutionStatus => {
  switch (value) {
    case 'queued':
    case 'in_progress':
    case 'completed':
    case 'pending':
    case 'waiting':
    case 'requested':
      return value;
    default:
      throw new GitHubWorkflowRunsSyncError();
  }
};

const mapWorkflowExecutionConclusion = (
  value: string | null,
): WorkflowExecutionConclusion | null => {
  if (value === null) {
    return null;
  }

  switch (value) {
    case 'success':
    case 'failure':
    case 'neutral':
    case 'cancelled':
    case 'skipped':
    case 'timed_out':
    case 'action_required':
    case 'stale':
    case 'startup_failure':
      return value;
    default:
      throw new GitHubWorkflowRunsSyncError();
  }
};

const parseGitHubDate = (value: string | null): Date | null => {
  if (value === null) {
    return null;
  }

  return new Date(value);
};

const calculateDurationMs = (
  startedAt: Date | null,
  finishedAt: Date | null,
): number | null => {
  if (!startedAt || !finishedAt) {
    return null;
  }

  const durationMs = finishedAt.getTime() - startedAt.getTime();
  return durationMs >= 0 ? durationMs : null;
};
