import { describe, expect, it, vi } from 'vitest';
import { GitHubWorkflowRunsSyncError } from '../../../modules/github/github-app.errors.js';
import type { Repository } from '../../../modules/repository-registry/repository.entity.js';
import { RepositoryNotFoundError } from '../../../modules/repository-registry/repository.errors.js';
import type { Workflow } from '../../../modules/workflow-catalog/workflow.entity.js';
import type { WorkflowJob, WorkflowRun } from '../../../modules/workflow-runs/workflow-run.entity.js';
import { WorkflowRunService } from '../../../modules/workflow-runs/workflow-run.service.js';

const buildRepository = (overrides: Partial<Repository> = {}): Repository => {
  const createdAt = new Date('2026-03-30T10:00:00.000Z');

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

const buildWorkflow = (overrides: Partial<Workflow> = {}): Workflow => {
  const createdAt = new Date('2026-03-30T10:05:00.000Z');

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
  const startedAt = new Date('2026-03-30T12:00:00.000Z');

  return {
    id: 'run_123',
    workflowId: 'workflow_123',
    githubRunId: '777',
    status: 'completed',
    conclusion: 'success',
    branch: 'main',
    sha: 'abc123def456',
    event: 'push',
    startedAt,
    finishedAt: new Date('2026-03-30T12:05:00.000Z'),
    durationMs: 300000,
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
};

const buildWorkflowJob = (overrides: Partial<WorkflowJob> = {}): WorkflowJob => {
  const startedAt = new Date('2026-03-30T12:01:00.000Z');

  return {
    id: 'job_123',
    workflowRunId: 'run_123',
    githubJobId: '888',
    name: 'lint',
    status: 'completed',
    conclusion: 'success',
    startedAt,
    finishedAt: new Date('2026-03-30T12:02:00.000Z'),
    createdAt: startedAt,
    updatedAt: startedAt,
    ...overrides,
  };
};

describe('WorkflowRunService', () => {
  it('should sync workflow runs and jobs for cataloged workflows', async () => {
    const findById = vi.fn().mockResolvedValue(buildRepository());
    const listByRepositoryId = vi.fn().mockResolvedValue([buildWorkflow()]);
    const upsertRun = vi
      .fn()
      .mockResolvedValueOnce(buildWorkflowRun())
      .mockResolvedValueOnce(
        buildWorkflowRun({
          id: 'run_456',
          githubRunId: '778',
          status: 'in_progress',
          conclusion: null,
          finishedAt: null,
          durationMs: null,
        }),
      );
    const upsertJob = vi
      .fn()
      .mockResolvedValueOnce(buildWorkflowJob())
      .mockResolvedValueOnce(
        buildWorkflowJob({
          id: 'job_456',
          workflowRunId: 'run_456',
          githubJobId: '889',
          name: 'test',
          status: 'in_progress',
          conclusion: null,
          finishedAt: null,
        }),
      );
    const listWorkflowRuns = vi.fn().mockResolvedValue([
      {
        githubRunId: '777',
        status: 'completed',
        conclusion: 'success',
        branch: 'main',
        sha: 'abc123def456',
        event: 'push',
        startedAt: new Date('2026-03-30T12:00:00.000Z'),
        finishedAt: new Date('2026-03-30T12:05:00.000Z'),
        durationMs: 300000,
      },
      {
        githubRunId: '778',
        status: 'in_progress',
        conclusion: null,
        branch: 'main',
        sha: 'fed654cba321',
        event: 'pull_request',
        startedAt: new Date('2026-03-30T12:10:00.000Z'),
        finishedAt: null,
        durationMs: null,
      },
    ]);
    const listWorkflowRunJobs = vi
      .fn()
      .mockResolvedValueOnce([
        {
          githubJobId: '888',
          name: 'lint',
          status: 'completed',
          conclusion: 'success',
          startedAt: new Date('2026-03-30T12:01:00.000Z'),
          finishedAt: new Date('2026-03-30T12:02:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          githubJobId: '889',
          name: 'test',
          status: 'in_progress',
          conclusion: null,
          startedAt: new Date('2026-03-30T12:11:00.000Z'),
          finishedAt: null,
        },
      ]);
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new WorkflowRunService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById,
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId,
      },
      workflowRunRepository: {
        createRun: vi.fn(),
        upsertRun,
        listRunsByWorkflowId: vi.fn(),
        createJob: vi.fn(),
        upsertJob,
        listJobsByWorkflowRunId: vi.fn(),
      },
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
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns,
        listWorkflowRunJobs,
      },
      logger,
    });

    await expect(service.syncByRepositoryId('repo_123')).resolves.toEqual([
      buildWorkflowRun(),
      buildWorkflowRun({
        id: 'run_456',
        githubRunId: '778',
        status: 'in_progress',
        conclusion: null,
        finishedAt: null,
        durationMs: null,
      }),
    ]);

    expect(findById).toHaveBeenCalledWith('repo_123');
    expect(listByRepositoryId).toHaveBeenCalledWith('repo_123');
    expect(listWorkflowRuns).toHaveBeenCalledWith(
      {
        owner: 'forgeops',
        name: 'backend',
      },
      'workflow-gh-123',
    );
    expect(upsertRun).toHaveBeenNthCalledWith(1, {
      workflowId: 'workflow_123',
      githubRunId: '777',
      status: 'completed',
      conclusion: 'success',
      branch: 'main',
      sha: 'abc123def456',
      event: 'push',
      startedAt: new Date('2026-03-30T12:00:00.000Z'),
      finishedAt: new Date('2026-03-30T12:05:00.000Z'),
      durationMs: 300000,
    });
    expect(upsertRun).toHaveBeenNthCalledWith(2, {
      workflowId: 'workflow_123',
      githubRunId: '778',
      status: 'in_progress',
      conclusion: null,
      branch: 'main',
      sha: 'fed654cba321',
      event: 'pull_request',
      startedAt: new Date('2026-03-30T12:10:00.000Z'),
      finishedAt: null,
      durationMs: null,
    });
    expect(listWorkflowRunJobs).toHaveBeenNthCalledWith(
      1,
      {
        owner: 'forgeops',
        name: 'backend',
      },
      '777',
    );
    expect(listWorkflowRunJobs).toHaveBeenNthCalledWith(
      2,
      {
        owner: 'forgeops',
        name: 'backend',
      },
      '778',
    );
    expect(upsertJob).toHaveBeenNthCalledWith(1, {
      workflowRunId: 'run_123',
      githubJobId: '888',
      name: 'lint',
      status: 'completed',
      conclusion: 'success',
      startedAt: new Date('2026-03-30T12:01:00.000Z'),
      finishedAt: new Date('2026-03-30T12:02:00.000Z'),
    });
    expect(upsertJob).toHaveBeenNthCalledWith(2, {
      workflowRunId: 'run_456',
      githubJobId: '889',
      name: 'test',
      status: 'in_progress',
      conclusion: null,
      startedAt: new Date('2026-03-30T12:11:00.000Z'),
      finishedAt: null,
    });
    expect(logger.info).toHaveBeenCalledWith(
      {
        event: 'workflow_runs_sync_succeeded',
        repositoryId: 'repo_123',
        fullName: 'forgeops/backend',
        catalogedWorkflowCount: 1,
        syncedRunCount: 2,
        syncedJobCount: 2,
      },
      'Workflow runs sync completed.',
    );
  });

  it('should succeed with no runs when cataloged workflows return an empty result', async () => {
    const listWorkflowRuns = vi.fn().mockResolvedValue([]);
    const listWorkflowRunJobs = vi.fn();
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new WorkflowRunService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn().mockResolvedValue([buildWorkflow()]),
      },
      workflowRunRepository: {
        createRun: vi.fn(),
        upsertRun: vi.fn(),
        listRunsByWorkflowId: vi.fn(),
        createJob: vi.fn(),
        upsertJob: vi.fn(),
        listJobsByWorkflowRunId: vi.fn(),
      },
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
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns,
        listWorkflowRunJobs,
      },
      logger,
    });

    await expect(service.syncByRepositoryId('repo_123')).resolves.toEqual([]);
    expect(listWorkflowRunJobs).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      {
        event: 'workflow_runs_sync_succeeded',
        repositoryId: 'repo_123',
        fullName: 'forgeops/backend',
        catalogedWorkflowCount: 1,
        syncedRunCount: 0,
        syncedJobCount: 0,
      },
      'Workflow runs sync completed.',
    );
  });

  it('should fail with repository not found when sync receives an unknown repository id', async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new WorkflowRunService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
      },
      workflowRunRepository: {
        createRun: vi.fn(),
        upsertRun: vi.fn(),
        listRunsByWorkflowId: vi.fn(),
        createJob: vi.fn(),
        upsertJob: vi.fn(),
        listJobsByWorkflowRunId: vi.fn(),
      },
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
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => [],
        listWorkflowRunJobs: async () => [],
      },
      logger,
    });

    await expect(service.syncByRepositoryId('missing_repo')).rejects.toBeInstanceOf(
      RepositoryNotFoundError,
    );
    expect(logger.error).toHaveBeenCalledWith(
      {
        event: 'workflow_runs_sync_failed',
        repositoryId: 'missing_repo',
        errorCode: 'repository_not_found',
        errorStatusCode: 404,
      },
      'Workflow runs sync failed.',
    );
  });

  it('should propagate a safe GitHub workflow runs error during sync', async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    const service = new WorkflowRunService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn().mockResolvedValue([buildWorkflow()]),
      },
      workflowRunRepository: {
        createRun: vi.fn(),
        upsertRun: vi.fn(),
        listRunsByWorkflowId: vi.fn(),
        createJob: vi.fn(),
        upsertJob: vi.fn(),
        listJobsByWorkflowRunId: vi.fn(),
      },
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
        listInstallationRepositories: async () => [],
        listRepositoryWorkflows: async () => [],
        listWorkflowRuns: async () => {
          throw new GitHubWorkflowRunsSyncError();
        },
        listWorkflowRunJobs: async () => [],
      },
      logger,
    });

    await expect(service.syncByRepositoryId('repo_123')).rejects.toBeInstanceOf(
      GitHubWorkflowRunsSyncError,
    );
    expect(logger.error).toHaveBeenCalledWith(
      {
        event: 'workflow_runs_sync_failed',
        repositoryId: 'repo_123',
        fullName: 'forgeops/backend',
        errorCode: 'github_workflow_runs_unavailable',
        errorStatusCode: 503,
      },
      'Workflow runs sync failed.',
    );
  });
});
