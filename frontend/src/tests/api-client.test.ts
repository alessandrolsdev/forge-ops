import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, createApiClient } from '@/lib/api/client';

describe('createApiClient', () => {
  it('should fetch and parse backend health', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          service: 'forgeops-backend',
          timestamp: '2026-01-01T00:00:00.000Z',
          environment: 'test',
          integrations: {
            github: {
              mode: 'github-app',
              configured: false,
              appId: null,
              installationId: null,
              webhookConfigured: false,
            },
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    const client = createApiClient({
      baseUrl: 'http://localhost:3333/',
      fetcher,
    });

    await expect(client.getHealth()).resolves.toMatchObject({
      status: 'ok',
      environment: 'test',
    });
    expect(fetcher).toHaveBeenCalledWith('http://localhost:3333/api/v1/health', {
      headers: {
        accept: 'application/json',
      },
    });
  });

  it('should reject non-success responses', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:3333',
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(null, {
          status: 503,
        }),
      ),
    });

    await expect(client.getHealth()).rejects.toThrowError(
      'Failed to fetch backend health (503)',
    );
  });

  it('should fetch monitored repositories with operator authorization', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          repositories: [
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
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );
    const client = createApiClient({
      baseUrl: 'http://localhost:3333',
      fetcher,
    });

    await expect(client.getRepositories('trusted-token')).resolves.toEqual([
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
    expect(fetcher).toHaveBeenCalledWith('http://localhost:3333/api/v1/repositories', {
      headers: {
        accept: 'application/json',
        authorization: 'Bearer trusted-token',
      },
    });
  });

  it('should fetch repository discovery with operator authorization', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          repositories: [
            {
              githubRepoId: '123456789',
              owner: 'forgeops',
              name: 'backend',
              fullName: 'forgeops/backend',
              defaultBranch: 'main',
              isPrivate: true,
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );
    const client = createApiClient({
      baseUrl: 'http://localhost:3333',
      fetcher,
    });

    await expect(client.getRepositoryDiscovery('trusted-token')).resolves.toEqual([
      {
        githubRepoId: '123456789',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
        isPrivate: true,
      },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/repositories/discovery',
      {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
        },
      },
    );
  });

  it('should fetch repository workflows with operator authorization', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          workflows: [
            {
              id: 'workflow_123',
              repositoryId: 'repo_123',
              githubWorkflowId: 'workflow-gh-123',
              name: 'CI',
              path: '.github/workflows/ci.yml',
              state: 'active',
              sourceType: 'local',
              createdAt: '2026-03-30T00:00:00.000Z',
              updatedAt: '2026-03-30T00:00:00.000Z',
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );
    const client = createApiClient({
      baseUrl: 'http://localhost:3333',
      fetcher,
    });

    await expect(client.getRepositoryWorkflows('trusted-token', 'repo_123')).resolves.toEqual([
      {
        id: 'workflow_123',
        repositoryId: 'repo_123',
        githubWorkflowId: 'workflow-gh-123',
        name: 'CI',
        path: '.github/workflows/ci.yml',
        state: 'active',
        sourceType: 'local',
        createdAt: '2026-03-30T00:00:00.000Z',
        updatedAt: '2026-03-30T00:00:00.000Z',
      },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/repositories/repo_123/workflows',
      {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
        },
      },
    );
  });

  it('should fetch workflow runs with operator authorization', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          runs: [
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
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );
    const client = createApiClient({
      baseUrl: 'http://localhost:3333',
      fetcher,
    });

    await expect(client.getWorkflowRuns('trusted-token', 'repo_123', 'workflow_123')).resolves.toEqual(
      [
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
      ],
    );
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/repositories/repo_123/workflows/workflow_123/runs',
      {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
        },
      },
    );
  });

  it('should fetch pull requests with operator authorization', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          pullRequests: [
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
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );
    const client = createApiClient({
      baseUrl: 'http://localhost:3333',
      fetcher,
    });

    await expect(client.getPullRequests('trusted-token', 'repo_123')).resolves.toEqual([
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
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/repositories/repo_123/pull-requests',
      {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
        },
      },
    );
  });

  it('should fetch pull request detail with summary and workflows', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
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
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );
    const client = createApiClient({
      baseUrl: 'http://localhost:3333',
      fetcher,
    });

    await expect(
      client.getPullRequestDetail('trusted-token', 'repo_123', 'pr_123'),
    ).resolves.toEqual({
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
      ],
    });
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/repositories/repo_123/pull-requests/pr_123',
      {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
        },
      },
    );
  });

  it('should fetch workflow run detail with jobs', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
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
              startedAt: '2026-03-31T11:00:30.000Z',
              finishedAt: '2026-03-31T11:01:00.000Z',
              createdAt: '2026-03-31T11:00:30.000Z',
              updatedAt: '2026-03-31T11:01:00.000Z',
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );
    const client = createApiClient({
      baseUrl: 'http://localhost:3333',
      fetcher,
    });

    await expect(
      client.getWorkflowRunDetail('trusted-token', 'repo_123', 'workflow_123', 'run_123'),
    ).resolves.toEqual({
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
          startedAt: '2026-03-31T11:00:30.000Z',
          finishedAt: '2026-03-31T11:01:00.000Z',
          createdAt: '2026-03-31T11:00:30.000Z',
          updatedAt: '2026-03-31T11:01:00.000Z',
        },
      ],
    });
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3333/api/v1/repositories/repo_123/workflows/workflow_123/runs/run_123',
      {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
        },
      },
    );
  });

  it('should create repositories and surface structured API errors', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            repository: {
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
          }),
          {
            status: 201,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'repository_already_exists',
              message: 'Repository is already monitored.',
            },
          }),
          {
            status: 409,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );
    const client = createApiClient({
      baseUrl: 'http://localhost:3333',
      fetcher,
    });

    await expect(
      client.createRepository('trusted-token', {
        githubRepoId: '123456789',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
      }),
    ).resolves.toMatchObject({
      id: 'repo_123',
      fullName: 'forgeops/backend',
    });

    await expect(
      client.createRepository('trusted-token', {
        githubRepoId: '123456789',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
      }),
    ).rejects.toEqual(
      new ApiClientError('Repository is already monitored.', 409, 'repository_already_exists'),
    );

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3333/api/v1/repositories',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: 'Bearer trusted-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          githubRepoId: '123456789',
          owner: 'forgeops',
          name: 'backend',
          fullName: 'forgeops/backend',
          defaultBranch: 'main',
        }),
      },
    );
  });
});

