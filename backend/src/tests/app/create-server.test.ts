import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../../app/create-server.js';
import {
  GitHubRepositoryDiscoveryError,
  GitHubWorkflowCatalogSyncError,
} from '../../modules/github/github-app.errors.js';
import { RepositoryAlreadyExistsError } from '../../modules/repository-registry/repository.errors.js';
import { createOperatorPrincipal } from '../../shared/auth/operator-principal.js';
import type {
  CreateRepositoryInput,
  Repository,
} from '../../modules/repository-registry/repository.entity.js';
import type { GitHubInstallationRepository } from '../../modules/github/github-app.boundary.js';
import type { Workflow } from '../../modules/workflow-catalog/workflow.entity.js';
import type {
  WorkflowJob,
  WorkflowRun,
} from '../../modules/workflow-runs/workflow-run.entity.js';
import type { PullRequest } from '../../modules/pull-request-insights/pull-request.entity.js';
import type { CodexReviewSummary } from '../../modules/pull-request-insights/codex-review-summary.entity.js';

const buildRepository = (
  overrides: Partial<Repository> = {},
): Repository => {
  const createdAt = new Date('2026-03-27T16:45:00.000Z');

  return {
    id: 'repo_123',
    githubRepoId: '123456789',
    owner: 'forgeops',
    name: 'backend',
    fullName: 'forgeops/backend',
    defaultBranch: 'main',
    isActive: true,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const buildCreateRepositoryInput = (
  overrides: Partial<CreateRepositoryInput> = {},
): CreateRepositoryInput => {
  return {
    githubRepoId: '123456789',
    owner: 'forgeops',
    name: 'backend',
    fullName: 'forgeops/backend',
    defaultBranch: 'main',
    ...overrides,
  };
};

const buildInstallationRepository = (
  overrides: Partial<GitHubInstallationRepository> = {},
): GitHubInstallationRepository => {
  return {
    githubRepoId: '123456789',
    owner: 'forgeops',
    name: 'backend',
    fullName: 'forgeops/backend',
    defaultBranch: 'main',
    isPrivate: true,
    ...overrides,
  };
};

const buildWorkflow = (overrides: Partial<Workflow> = {}): Workflow => {
  const createdAt = new Date('2026-03-30T15:10:00.000Z');

  return {
    id: 'workflow_123',
    repositoryId: 'repo_123',
    githubWorkflowId: 'workflow-gh-123',
    name: 'CI',
    path: '.github/workflows/ci.yml',
    state: 'active',
    sourceType: 'local',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const buildWorkflowRun = (overrides: Partial<WorkflowRun> = {}): WorkflowRun => {
  const startedAt = new Date('2026-03-30T16:00:00.000Z');

  return {
    id: 'run_123',
    workflowId: 'workflow_123',
    githubRunId: 'run-gh-123',
    status: 'completed',
    conclusion: 'success',
    branch: 'main',
    sha: 'abc123def456',
    event: 'push',
    startedAt,
    finishedAt: new Date('2026-03-30T16:05:00.000Z'),
    durationMs: 300000,
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
};

const buildWorkflowJob = (overrides: Partial<WorkflowJob> = {}): WorkflowJob => {
  const startedAt = new Date('2026-03-30T16:01:00.000Z');

  return {
    id: 'job_123',
    workflowRunId: 'run_123',
    githubJobId: 'job-gh-123',
    name: 'lint',
    status: 'completed',
    conclusion: 'success',
    startedAt,
    finishedAt: new Date('2026-03-30T16:02:00.000Z'),
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
};

const buildPullRequest = (overrides: Partial<PullRequest> = {}): PullRequest => {
  const createdAt = new Date('2026-03-31T18:20:00.000Z');

  return {
    id: 'pr_123',
    repositoryId: 'repo_123',
    githubPrId: '987654321',
    number: 42,
    title: 'Add pull request insights',
    state: 'open',
    author: 'alessandrolsdev',
    baseBranch: 'main',
    headBranch: 'feature/pull-request-insights',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const buildCodexReviewSummary = (
  overrides: Partial<CodexReviewSummary> = {},
): CodexReviewSummary => {
  const createdAt = new Date('2026-03-31T18:50:00.000Z');

  return {
    id: 'summary_123',
    pullRequestId: 'pr_123',
    source: 'github_review',
    summary: 'Codex sinalizou 2 achados relevantes.',
    blockersCount: 1,
    suggestionsCount: 1,
    risksCount: 2,
    rawContent: '[src/api.ts]\n[P1] Validar input',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const createProtectedServer = (overrides?: {
  repositories?: Repository[];
  workflows?: Workflow[];
  workflowRuns?: WorkflowRun[];
  workflowJobs?: WorkflowJob[];
  pullRequests?: PullRequest[];
  codexReviewSummaries?: CodexReviewSummary[];
  createRepository?: (input: CreateRepositoryInput) => Promise<Repository>;
  deleteRepositoryById?: (id: string) => Promise<void>;
  installationRepositories?: GitHubInstallationRepository[];
  installationDiscoveryError?: Error;
  workflowCatalogSyncError?: Error;
  githubWorkflows?: Array<{
    githubWorkflowId: string;
    name: string;
    path: string;
    state: Workflow['state'];
    sourceType: Workflow['sourceType'];
  }>;
  capabilities?: string[];
}) => {
  const repositoryStore = [...(overrides?.repositories ?? [])];
  const workflowStore = [...(overrides?.workflows ?? [])];
  const workflowRunStore: WorkflowRun[] = [...(overrides?.workflowRuns ?? [])];
  const workflowJobStore: WorkflowJob[] = [...(overrides?.workflowJobs ?? [])];
  const pullRequestStore: PullRequest[] = [...(overrides?.pullRequests ?? [])];
  const codexReviewSummaryStore: CodexReviewSummary[] = [
    ...(overrides?.codexReviewSummaries ?? []),
  ];

  return createServer({
    env: {
      NODE_ENV: 'test',
      PORT: 3333,
      LOG_LEVEL: 'silent',
    },
    authConfig: {
      issuer: 'https://forgeops.example.com',
      audience: 'forgeops-api',
      verifierSource: {
        type: 'shared-secret',
        sharedSecret: 'secret',
      },
    },
    authVerifier: {
      verify: async ({ token }) =>
        createOperatorPrincipal({
          subject: `operator:${token}`,
          email: 'operator@forgeops.dev',
          capabilities:
            overrides?.capabilities ?? ['repositories:read', 'repositories:write'],
        }),
    },
    githubConfig: null,
    githubBoundary: {
      mode: 'github-app',
      configured: true,
      getStatus: () => ({
        mode: 'github-app',
        configured: true,
        appId: '12****56',
        installationId: '78****10',
        webhookConfigured: true,
      }),
      assertConfigured: () => undefined,
      listInstallationRepositories: async () => {
        if (overrides?.installationDiscoveryError) {
          throw overrides.installationDiscoveryError;
        }

        return overrides?.installationRepositories ?? [];
      },
      listRepositoryWorkflows: async () => {
        if (overrides?.workflowCatalogSyncError) {
          throw overrides.workflowCatalogSyncError;
        }

        return (
          overrides?.githubWorkflows ?? [
            {
              githubWorkflowId: 'workflow-gh-123',
              name: 'CI',
              path: '.github/workflows/ci.yml',
              state: 'active',
              sourceType: 'local',
            },
          ]
        );
      },
      listWorkflowRuns: async () => [],
      listWorkflowRunJobs: async () => [],
      listPullRequests: async () => [],
      listPullRequestReviewComments: async () => [],
    },
    repositoryRegistryRepository: {
      list: async () => [...repositoryStore],
      findById: async (id) =>
        repositoryStore.find((repository) => repository.id === id) ?? null,
      create:
        overrides?.createRepository ??
        (async (input) => {
          const repository = buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          });

          repositoryStore.unshift(repository);

          return repository;
        }),
      deleteById:
        overrides?.deleteRepositoryById ??
        (async (id) => {
          const repositoryIndex = repositoryStore.findIndex(
            (repository) => repository.id === id,
          );

          if (repositoryIndex >= 0) {
            repositoryStore.splice(repositoryIndex, 1);
          }
        }),
    },
    workflowCatalogRepository: {
      create: async () => buildWorkflow(),
      upsert: async (input) => {
        const existingWorkflowIndex = workflowStore.findIndex(
          (workflow) =>
            workflow.repositoryId === input.repositoryId &&
            workflow.githubWorkflowId === input.githubWorkflowId,
        );
        const workflow = buildWorkflow({
          id:
            existingWorkflowIndex >= 0
              ? workflowStore[existingWorkflowIndex]!.id
              : `workflow_${workflowStore.length + 1}`,
          repositoryId: input.repositoryId,
          githubWorkflowId: input.githubWorkflowId,
          name: input.name,
          path: input.path,
          state: input.state,
          sourceType: input.sourceType,
        });

        if (existingWorkflowIndex >= 0) {
          workflowStore[existingWorkflowIndex] = workflow;
        } else {
          workflowStore.push(workflow);
        }

        return workflow;
      },
      listByRepositoryId: async (repositoryId) =>
        workflowStore.filter((workflow) => workflow.repositoryId === repositoryId),
      findById: async (id) =>
        workflowStore.find((workflow) => workflow.id === id) ?? null,
    },
    workflowRunRepository: {
      createRun: async (input) =>
        buildWorkflowRun({
          workflowId: input.workflowId,
          githubRunId: input.githubRunId,
          status: input.status,
          conclusion: input.conclusion,
          branch: input.branch,
          sha: input.sha,
          event: input.event,
          startedAt: input.startedAt,
          finishedAt: input.finishedAt,
          durationMs: input.durationMs,
        }),
      upsertRun: async (input) => {
        const existingRunIndex = workflowRunStore.findIndex(
          (workflowRun) =>
            workflowRun.workflowId === input.workflowId &&
            workflowRun.githubRunId === input.githubRunId,
        );
        const workflowRun = buildWorkflowRun({
          id:
            existingRunIndex >= 0
              ? workflowRunStore[existingRunIndex]!.id
              : `run_${workflowRunStore.length + 1}`,
          workflowId: input.workflowId,
          githubRunId: input.githubRunId,
          status: input.status,
          conclusion: input.conclusion,
          branch: input.branch,
          sha: input.sha,
          event: input.event,
          startedAt: input.startedAt,
          finishedAt: input.finishedAt,
          durationMs: input.durationMs,
        });

        if (existingRunIndex >= 0) {
          workflowRunStore[existingRunIndex] = workflowRun;
        } else {
          workflowRunStore.push(workflowRun);
        }

        return workflowRun;
      },
      listRunsByWorkflowId: async (workflowId) =>
        workflowRunStore
          .filter((workflowRun) => workflowRun.workflowId === workflowId)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
      findRunById: async (id) =>
        workflowRunStore.find((workflowRun) => workflowRun.id === id) ?? null,
      createJob: async (input) =>
        buildWorkflowJob({
          workflowRunId: input.workflowRunId,
          githubJobId: input.githubJobId,
          name: input.name,
          status: input.status,
          conclusion: input.conclusion,
          startedAt: input.startedAt,
          finishedAt: input.finishedAt,
        }),
      upsertJob: async (input) => {
        const existingJobIndex = workflowJobStore.findIndex(
          (workflowJob) =>
            workflowJob.workflowRunId === input.workflowRunId &&
            workflowJob.githubJobId === input.githubJobId,
        );
        const workflowJob = buildWorkflowJob({
          id:
            existingJobIndex >= 0
              ? workflowJobStore[existingJobIndex]!.id
              : `job_${workflowJobStore.length + 1}`,
          workflowRunId: input.workflowRunId,
          githubJobId: input.githubJobId,
          name: input.name,
          status: input.status,
          conclusion: input.conclusion,
          startedAt: input.startedAt,
          finishedAt: input.finishedAt,
        });

        if (existingJobIndex >= 0) {
          workflowJobStore[existingJobIndex] = workflowJob;
        } else {
          workflowJobStore.push(workflowJob);
        }

        return workflowJob;
      },
      listJobsByWorkflowRunId: async (workflowRunId) =>
        workflowJobStore
          .filter((workflowJob) => workflowJob.workflowRunId === workflowRunId)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    },
    pullRequestRepository: {
      create: async (input) =>
        buildPullRequest({
          repositoryId: input.repositoryId,
          githubPrId: input.githubPrId,
          number: input.number,
          title: input.title,
          state: input.state,
          author: input.author,
          baseBranch: input.baseBranch,
          headBranch: input.headBranch,
        }),
      upsert: async (input) => {
        const existingPullRequestIndex = pullRequestStore.findIndex(
          (pullRequest) =>
            pullRequest.repositoryId === input.repositoryId &&
            pullRequest.githubPrId === input.githubPrId,
        );
        const pullRequest = buildPullRequest({
          id:
            existingPullRequestIndex >= 0
              ? pullRequestStore[existingPullRequestIndex]!.id
              : `pr_${pullRequestStore.length + 1}`,
          repositoryId: input.repositoryId,
          githubPrId: input.githubPrId,
          number: input.number,
          title: input.title,
          state: input.state,
          author: input.author,
          baseBranch: input.baseBranch,
          headBranch: input.headBranch,
        });

        if (existingPullRequestIndex >= 0) {
          pullRequestStore[existingPullRequestIndex] = pullRequest;
        } else {
          pullRequestStore.push(pullRequest);
        }

        return pullRequest;
      },
      listByRepositoryId: async (repositoryId) =>
        pullRequestStore
          .filter((pullRequest) => pullRequest.repositoryId === repositoryId)
          .sort((left, right) => right.number - left.number),
      findById: async (id) =>
        pullRequestStore.find((pullRequest) => pullRequest.id === id) ?? null,
    },
    codexReviewSummaryRepository: {
      create: async (input) =>
        buildCodexReviewSummary({
          pullRequestId: input.pullRequestId,
          source: input.source,
          summary: input.summary,
          blockersCount: input.blockersCount,
          suggestionsCount: input.suggestionsCount,
          risksCount: input.risksCount,
          rawContent: input.rawContent,
        }),
      upsert: async (input) => {
        const existingSummaryIndex = codexReviewSummaryStore.findIndex(
          (summary) => summary.pullRequestId === input.pullRequestId,
        );
        const summary = buildCodexReviewSummary({
          id:
            existingSummaryIndex >= 0
              ? codexReviewSummaryStore[existingSummaryIndex]!.id
              : `summary_${codexReviewSummaryStore.length + 1}`,
          pullRequestId: input.pullRequestId,
          source: input.source,
          summary: input.summary,
          blockersCount: input.blockersCount,
          suggestionsCount: input.suggestionsCount,
          risksCount: input.risksCount,
          rawContent: input.rawContent,
        });

        if (existingSummaryIndex >= 0) {
          codexReviewSummaryStore[existingSummaryIndex] = summary;
        } else {
          codexReviewSummaryStore.push(summary);
        }

        return summary;
      },
      findByPullRequestId: async (pullRequestId) =>
        codexReviewSummaryStore.find(
          (summary) => summary.pullRequestId === pullRequestId,
        ) ?? null,
    },
  });
};

describe('createServer', () => {
  afterEach(async () => {
    // no-op placeholder to keep Vitest lifecycle explicit when tests grow
  });

  it('should expose the health endpoint', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: null,
      authVerifier: null,
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
        deleteById: async () => undefined,
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/health?verbose=true',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      environment: 'test',
      integrations: {
        github: {
          configured: false,
        },
      },
    });

    await server.close();
  });

  it('should reject invalid health query parameters', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: null,
      authVerifier: null,
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
        deleteById: async () => undefined,
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/health?verbose=invalid',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'Invalid input',
      },
    });

    await server.close();
  });

  it('should decorate requests with an operator principal context slot', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: null,
      authVerifier: null,
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
        deleteById: async () => undefined,
      },
    });

    expect(server.hasRequestDecorator('operatorPrincipal')).toBe(true);

    await server.close();
  });

  it('should reject protected routes without authentication', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: {
        issuer: 'https://forgeops.example.com',
        audience: 'forgeops-api',
        verifierSource: {
          type: 'shared-secret',
          sharedSecret: 'secret',
        },
      },
      authVerifier: {
        verify: async () => {
          throw new Error('This should not run without a token.');
        },
      },
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
        deleteById: async () => undefined,
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'authentication_required',
        message: 'Authentication is required.',
      },
    });

    await server.close();
  });

  it('should fail safely when protected auth dependencies are missing', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: null,
      authVerifier: null,
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
        deleteById: async () => undefined,
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: 'Bearer token',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: 'auth_not_configured',
        message: 'Operator authentication is not configured.',
      },
    });

    await server.close();
  });

  it('should allow protected routes with a verified operator principal', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: {
        issuer: 'https://forgeops.example.com',
        audience: 'forgeops-api',
        verifierSource: {
          type: 'shared-secret',
          sharedSecret: 'secret',
        },
      },
      authVerifier: {
        verify: async ({ token }) =>
          createOperatorPrincipal({
            subject: `operator:${token}`,
            email: 'operator@forgeops.dev',
            capabilities: ['repositories:read'],
          }),
      },
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
        deleteById: async () => undefined,
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      principal: {
        kind: 'operator',
        subject: 'operator:trusted-token',
        email: 'operator@forgeops.dev',
        displayName: null,
        capabilities: ['repositories:read'],
      },
    });

    await server.close();
  });

  it('should return a safe authentication error when token verification fails', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: {
        issuer: 'https://forgeops.example.com',
        audience: 'forgeops-api',
        verifierSource: {
          type: 'shared-secret',
          sharedSecret: 'secret',
        },
      },
      authVerifier: {
        verify: async () => {
          throw new Error('Invalid signature details');
        },
      },
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
        deleteById: async () => undefined,
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'authentication_required',
        message: 'Authentication failed.',
      },
    });

    await server.close();
  });

  it('should list repositories for an authenticated operator', async () => {
    const server = createProtectedServer({
      repositories: [],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      repositories: [],
    });

    await server.close();
  });

  it('should reject invalid repository payloads before service execution', async () => {
    const server = createProtectedServer();

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
      payload: {
        githubRepoId: '',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'validation_error',
        message:
          'String must contain at least 1 character(s); Required; Required; Required; Required',
      },
    });

    await server.close();
  });

  it('should create a repository for an authenticated operator', async () => {
    const server = createProtectedServer();

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
      payload: buildCreateRepositoryInput(),
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      repository: {
        id: 'repo_123',
        githubRepoId: '123456789',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
        isActive: true,
        createdAt: '2026-03-27T16:45:00.000Z',
        updatedAt: '2026-03-27T16:45:00.000Z',
      },
    });

    await server.close();
  });

  it('should sync workflows during repository creation so the catalog is immediately available', async () => {
    const server = createProtectedServer();

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
      payload: buildCreateRepositoryInput(),
    });

    expect(createResponse.statusCode).toBe(201);

    const workflowsResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(workflowsResponse.statusCode).toBe(200);
    expect(workflowsResponse.json()).toEqual({
      workflows: [
        {
          id: 'workflow_1',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          sourceType: 'local',
          createdAt: '2026-03-30T15:10:00.000Z',
          updatedAt: '2026-03-30T15:10:00.000Z',
        },
      ],
    });

    await server.close();
  });

  it('should roll back repository creation when workflow sync fails', async () => {
    const server = createProtectedServer({
      workflowCatalogSyncError: new GitHubWorkflowCatalogSyncError(),
    });

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
      payload: buildCreateRepositoryInput(),
    });

    expect(createResponse.statusCode).toBe(503);
    expect(createResponse.json()).toEqual({
      error: {
        code: 'github_workflow_catalog_unavailable',
        message: 'GitHub workflow catalog is currently unavailable.',
      },
    });

    const repositoriesResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(repositoriesResponse.statusCode).toBe(200);
    expect(repositoriesResponse.json()).toEqual({
      repositories: [],
    });

    await server.close();
  });

  it('should return a consistent conflict response when the repository already exists', async () => {
    const server = createProtectedServer({
      createRepository: async () => {
        throw new RepositoryAlreadyExistsError();
      },
    });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
      payload: buildCreateRepositoryInput(),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: 'repository_already_exists',
        message: 'Repository is already monitored.',
      },
    });

    await server.close();
  });

  it('should forbid repository creation without the write capability', async () => {
    const server = createProtectedServer({
      capabilities: ['repositories:read'],
    });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
      payload: buildCreateRepositoryInput(),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        code: 'forbidden',
        message: 'You are not allowed to perform this action.',
      },
    });

    await server.close();
  });

  it('should keep repository routes protected', async () => {
    const server = createProtectedServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'authentication_required',
        message: 'Authentication is required.',
      },
    });

    await server.close();
  });

  it('should list discoverable installation repositories for an authenticated operator', async () => {
    const server = createProtectedServer({
      installationRepositories: [
        buildInstallationRepository(),
        buildInstallationRepository({
          githubRepoId: '987654321',
          name: 'frontend',
          fullName: 'forgeops/frontend',
          isPrivate: false,
        }),
      ],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/discovery',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      repositories: [
        buildInstallationRepository(),
        buildInstallationRepository({
          githubRepoId: '987654321',
          name: 'frontend',
          fullName: 'forgeops/frontend',
          isPrivate: false,
        }),
      ],
    });

    await server.close();
  });

  it('should return a safe error when repository discovery fails', async () => {
    const server = createProtectedServer({
      installationDiscoveryError: new GitHubRepositoryDiscoveryError(),
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/discovery',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: 'github_repository_discovery_unavailable',
        message: 'GitHub repository discovery is currently unavailable.',
      },
    });

    await server.close();
  });

  it('should keep workflow catalog routes protected', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'authentication_required',
        message: 'Authentication is required.',
      },
    });

    await server.close();
  });

  it('should reject invalid workflow catalog route params before service execution', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/%20/workflows',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'String must contain at least 1 character(s)',
      },
    });

    await server.close();
  });

  it('should return not found when the workflow catalog repository does not exist', async () => {
    const server = createProtectedServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_missing/workflows',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'repository_not_found',
        message: 'Repository was not found.',
      },
    });

    await server.close();
  });

  it('should list workflow catalog entries for an authenticated operator', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [
        buildWorkflow(),
        buildWorkflow({
          id: 'workflow_456',
          githubWorkflowId: 'workflow-gh-456',
          name: 'Deploy',
          path: '.github/workflows/deploy.yml',
          sourceType: 'reusable',
        }),
      ],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      workflows: [
        {
          id: 'workflow_123',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-123',
          name: 'CI',
          path: '.github/workflows/ci.yml',
          state: 'active',
          sourceType: 'local',
          createdAt: '2026-03-30T15:10:00.000Z',
          updatedAt: '2026-03-30T15:10:00.000Z',
        },
        {
          id: 'workflow_456',
          repositoryId: 'repo_123',
          githubWorkflowId: 'workflow-gh-456',
          name: 'Deploy',
          path: '.github/workflows/deploy.yml',
          state: 'active',
          sourceType: 'reusable',
          createdAt: '2026-03-30T15:10:00.000Z',
          updatedAt: '2026-03-30T15:10:00.000Z',
        },
      ],
    });

    await server.close();
  });
  it('should keep workflow run routes protected', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [buildWorkflow()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows/workflow_123/runs',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'authentication_required',
        message: 'Authentication is required.',
      },
    });

    await server.close();
  });

  it('should reject invalid workflow run route params before service execution', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [buildWorkflow()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/%20/workflows/workflow_123/runs',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'String must contain at least 1 character(s)',
      },
    });

    await server.close();
  });

  it('should return not found when the workflow runs repository does not exist', async () => {
    const server = createProtectedServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_missing/workflows/workflow_123/runs',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'repository_not_found',
        message: 'Repository was not found.',
      },
    });

    await server.close();
  });

  it('should return not found when the workflow does not belong to the repository', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [
        buildWorkflow({
          id: 'workflow_other',
          repositoryId: 'repo_other',
        }),
      ],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows/workflow_other/runs',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'workflow_not_found',
        message: 'Workflow was not found.',
      },
    });

    await server.close();
  });

  it('should return an empty workflow runs list when the workflow has no persisted runs', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [buildWorkflow()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows/workflow_123/runs',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      runs: [],
    });

    await server.close();
  });

  it('should list workflow runs for an authenticated operator', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [buildWorkflow()],
      workflowRuns: [
        buildWorkflowRun({
          id: 'run_older',
          githubRunId: 'run-gh-older',
          status: 'completed',
          conclusion: 'failure',
          startedAt: new Date('2026-03-30T15:00:00.000Z'),
          finishedAt: new Date('2026-03-30T15:04:00.000Z'),
          durationMs: 240000,
          createdAt: new Date('2026-03-30T15:00:00.000Z'),
          updatedAt: new Date('2026-03-30T15:04:00.000Z'),
        }),
        buildWorkflowRun(),
      ],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows/workflow_123/runs',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      runs: [
        {
          id: 'run_123',
          workflowId: 'workflow_123',
          githubRunId: 'run-gh-123',
          status: 'completed',
          conclusion: 'success',
          branch: 'main',
          sha: 'abc123def456',
          event: 'push',
          startedAt: '2026-03-30T16:00:00.000Z',
          finishedAt: '2026-03-30T16:05:00.000Z',
          durationMs: 300000,
          createdAt: '2026-03-30T16:00:00.000Z',
          updatedAt: '2026-03-30T16:00:00.000Z',
        },
        {
          id: 'run_older',
          workflowId: 'workflow_123',
          githubRunId: 'run-gh-older',
          status: 'completed',
          conclusion: 'failure',
          branch: 'main',
          sha: 'abc123def456',
          event: 'push',
          startedAt: '2026-03-30T15:00:00.000Z',
          finishedAt: '2026-03-30T15:04:00.000Z',
          durationMs: 240000,
          createdAt: '2026-03-30T15:00:00.000Z',
          updatedAt: '2026-03-30T15:04:00.000Z',
        },
      ],
    });

    await server.close();
  });

  it('should keep workflow run detail routes protected', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [buildWorkflow()],
      workflowRuns: [buildWorkflowRun()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows/workflow_123/runs/run_123',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'authentication_required',
        message: 'Authentication is required.',
      },
    });

    await server.close();
  });

  it('should reject invalid workflow run detail route params before service execution', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [buildWorkflow()],
      workflowRuns: [buildWorkflowRun()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/%20/workflows/workflow_123/runs/run_123',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'String must contain at least 1 character(s)',
      },
    });

    await server.close();
  });

  it('should require authentication for pull request listing', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/pull-requests',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'authentication_required',
        message: 'Authentication is required.',
      },
    });

    await server.close();
  });

  it('should reject invalid pull request list route params before service execution', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/%20/pull-requests',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'String must contain at least 1 character(s)',
      },
    });

    await server.close();
  });

  it('should return not found when the repository does not exist for pull request listing', async () => {
    const server = createProtectedServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_missing/pull-requests',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'repository_not_found',
        message: 'Repository was not found.',
      },
    });

    await server.close();
  });

  it('should return an empty pull request list for a monitored repository', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      pullRequests: [],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/pull-requests',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      pullRequests: [],
    });

    await server.close();
  });

  it('should return pull requests for an authenticated operator', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      pullRequests: [
        buildPullRequest({
          id: 'pr_123',
          githubPrId: '987654321',
          number: 42,
          title: 'Add pull request insights',
          state: 'open',
          createdAt: new Date('2026-03-31T18:20:00.000Z'),
          updatedAt: new Date('2026-03-31T18:20:00.000Z'),
        }),
        buildPullRequest({
          id: 'pr_456',
          githubPrId: '987654322',
          number: 43,
          title: 'Close flaky workflow gap',
          state: 'merged',
          author: 'codex-bot',
          baseBranch: 'release',
          headBranch: 'feature/flaky-workflow-gap',
          createdAt: new Date('2026-03-31T18:30:00.000Z'),
          updatedAt: new Date('2026-03-31T18:31:00.000Z'),
        }),
      ],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/pull-requests',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      pullRequests: [
        {
          id: 'pr_456',
          githubPrId: '987654322',
          number: 43,
          title: 'Close flaky workflow gap',
          state: 'merged',
          author: 'codex-bot',
          baseBranch: 'release',
          headBranch: 'feature/flaky-workflow-gap',
          createdAt: '2026-03-31T18:30:00.000Z',
          updatedAt: '2026-03-31T18:31:00.000Z',
        },
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
      ],
    });

    await server.close();
  });

  it('should require authentication for pull request detail', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      pullRequests: [buildPullRequest()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/pull-requests/pr_123',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'authentication_required',
        message: 'Authentication is required.',
      },
    });

    await server.close();
  });

  it('should reject invalid pull request detail route params before service execution', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      pullRequests: [buildPullRequest()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/%20/pull-requests/pr_123',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'validation_error',
        message: 'String must contain at least 1 character(s)',
      },
    });

    await server.close();
  });

  it('should return repository not found for pull request detail', async () => {
    const server = createProtectedServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_missing/pull-requests/pr_123',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'repository_not_found',
        message: 'Repository was not found.',
      },
    });

    await server.close();
  });

  it('should return pull request not found when the pull request does not belong to the repository', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      pullRequests: [
        buildPullRequest({
          id: 'pr_other',
          repositoryId: 'repo_other',
        }),
      ],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/pull-requests/pr_other',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'pull_request_not_found',
        message: 'Pull request was not found.',
      },
    });

    await server.close();
  });

  it('should return pull request detail with summary and linked workflows', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      pullRequests: [buildPullRequest()],
      codexReviewSummaries: [buildCodexReviewSummary()],
      workflows: [
        buildWorkflow(),
        buildWorkflow({
          id: 'workflow_456',
          githubWorkflowId: 'workflow-gh-456',
          name: 'Deploy',
        }),
      ],
      workflowRuns: [
        buildWorkflowRun({
          branch: 'feature/pull-request-insights',
          startedAt: new Date('2026-03-31T18:40:00.000Z'),
          finishedAt: new Date('2026-03-31T18:45:00.000Z'),
          createdAt: new Date('2026-03-31T18:40:00.000Z'),
          updatedAt: new Date('2026-03-31T18:40:00.000Z'),
        }),
        buildWorkflowRun({
          id: 'run_456',
          workflowId: 'workflow_456',
          githubRunId: 'run-gh-456',
          status: 'in_progress',
          conclusion: null,
          branch: 'feature/pull-request-insights',
          startedAt: new Date('2026-03-31T19:00:00.000Z'),
          finishedAt: null,
          createdAt: new Date('2026-03-31T19:00:00.000Z'),
          updatedAt: new Date('2026-03-31T19:00:00.000Z'),
        }),
        buildWorkflowRun({
          id: 'run_ignored_old',
          githubRunId: 'run-gh-old',
          startedAt: new Date('2026-03-31T18:00:00.000Z'),
          finishedAt: new Date('2026-03-31T18:04:00.000Z'),
          createdAt: new Date('2026-03-31T18:00:00.000Z'),
          updatedAt: new Date('2026-03-31T18:04:00.000Z'),
        }),
        buildWorkflowRun({
          id: 'run_ignored_branch',
          githubRunId: 'run-gh-branch',
          branch: 'main',
        }),
      ],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/pull-requests/pr_123',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
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

    await server.close();
  });

  it('should return pull request detail without summary', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      pullRequests: [buildPullRequest()],
      workflows: [buildWorkflow()],
      workflowRuns: [
        buildWorkflowRun({
          branch: 'feature/pull-request-insights',
          startedAt: new Date('2026-03-31T18:40:00.000Z'),
          finishedAt: new Date('2026-03-31T18:45:00.000Z'),
          createdAt: new Date('2026-03-31T18:40:00.000Z'),
          updatedAt: new Date('2026-03-31T18:40:00.000Z'),
        }),
      ],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/pull-requests/pr_123',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: 'pr_123',
      number: 42,
      title: 'Add pull request insights',
      status: 'open',
      author: 'alessandrolsdev',
      summary: null,
      workflows: [
        {
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          startedAt: '2026-03-31T18:40:00.000Z',
          finishedAt: '2026-03-31T18:45:00.000Z',
        },
      ],
    });

    await server.close();
  });

  it('should return pull request detail without linked workflows', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      pullRequests: [buildPullRequest()],
      codexReviewSummaries: [buildCodexReviewSummary()],
      workflows: [],
      workflowRuns: [],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/pull-requests/pr_123',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
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
      workflows: [],
    });

    await server.close();
  });

  it('should return not found when the repository does not exist for workflow run detail', async () => {
    const server = createProtectedServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_missing/workflows/workflow_123/runs/run_123',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'repository_not_found',
        message: 'Repository was not found.',
      },
    });

    await server.close();
  });

  it('should return not found when the workflow does not belong to the repository for run detail', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [
        buildWorkflow({
          id: 'workflow_other',
          repositoryId: 'repo_other',
        }),
      ],
      workflowRuns: [buildWorkflowRun()],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows/workflow_other/runs/run_123',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'workflow_not_found',
        message: 'Workflow was not found.',
      },
    });

    await server.close();
  });

  it('should return not found when the workflow run does not exist', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [buildWorkflow()],
      workflowRuns: [],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows/workflow_123/runs/run_missing',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'workflow_run_not_found',
        message: 'Workflow run was not found.',
      },
    });

    await server.close();
  });

  it('should return not found when the run belongs to another workflow', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [buildWorkflow()],
      workflowRuns: [
        buildWorkflowRun({
          id: 'run_other',
          workflowId: 'workflow_other',
        }),
      ],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows/workflow_123/runs/run_other',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'workflow_run_not_found',
        message: 'Workflow run was not found.',
      },
    });

    await server.close();
  });

  it('should return workflow run detail with jobs for an authenticated operator', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [buildWorkflow()],
      workflowRuns: [buildWorkflowRun()],
      workflowJobs: [
        buildWorkflowJob(),
        buildWorkflowJob({
          id: 'job_456',
          githubJobId: 'job-gh-456',
          name: 'test',
          status: 'in_progress',
          conclusion: null,
          finishedAt: null,
          createdAt: new Date('2026-03-30T16:03:00.000Z'),
          updatedAt: new Date('2026-03-30T16:03:00.000Z'),
        }),
      ],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows/workflow_123/runs/run_123',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      run: {
        id: 'run_123',
        workflowId: 'workflow_123',
        githubRunId: 'run-gh-123',
        status: 'completed',
        conclusion: 'success',
        branch: 'main',
        sha: 'abc123def456',
        event: 'push',
        startedAt: '2026-03-30T16:00:00.000Z',
        finishedAt: '2026-03-30T16:05:00.000Z',
        durationMs: 300000,
        createdAt: '2026-03-30T16:00:00.000Z',
        updatedAt: '2026-03-30T16:00:00.000Z',
      },
      jobs: [
        {
          id: 'job_456',
          workflowRunId: 'run_123',
          githubJobId: 'job-gh-456',
          name: 'test',
          status: 'in_progress',
          conclusion: null,
          startedAt: '2026-03-30T16:01:00.000Z',
          finishedAt: null,
          createdAt: '2026-03-30T16:03:00.000Z',
          updatedAt: '2026-03-30T16:03:00.000Z',
        },
        {
          id: 'job_123',
          workflowRunId: 'run_123',
          githubJobId: 'job-gh-123',
          name: 'lint',
          status: 'completed',
          conclusion: 'success',
          startedAt: '2026-03-30T16:01:00.000Z',
          finishedAt: '2026-03-30T16:02:00.000Z',
          createdAt: '2026-03-30T16:01:00.000Z',
          updatedAt: '2026-03-30T16:01:00.000Z',
        },
      ],
    });

    await server.close();
  });

  it('should return workflow run detail with an empty jobs list', async () => {
    const server = createProtectedServer({
      repositories: [buildRepository()],
      workflows: [buildWorkflow()],
      workflowRuns: [buildWorkflowRun()],
      workflowJobs: [],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/repo_123/workflows/workflow_123/runs/run_123',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      run: {
        id: 'run_123',
        workflowId: 'workflow_123',
        githubRunId: 'run-gh-123',
        status: 'completed',
        conclusion: 'success',
        branch: 'main',
        sha: 'abc123def456',
        event: 'push',
        startedAt: '2026-03-30T16:00:00.000Z',
        finishedAt: '2026-03-30T16:05:00.000Z',
        durationMs: 300000,
        createdAt: '2026-03-30T16:00:00.000Z',
        updatedAt: '2026-03-30T16:00:00.000Z',
      },
      jobs: [],
    });

    await server.close();
  });
});
