import { describe, expect, it, vi } from 'vitest';
import { createGitHubAppBoundary } from '../../../modules/github/github-app.boundary.js';
import {
  GitHubRepositoryDiscoveryError,
  GitHubPullRequestSyncError,
  GitHubPullRequestReviewSyncError,
  GitHubWorkflowCatalogSyncError,
  GitHubWorkflowRunsSyncError,
} from '../../../modules/github/github-app.errors.js';

const buildConfig = () => ({
  GITHUB_APP_ID: '123456',
  GITHUB_APP_INSTALLATION_ID: '78910',
  GITHUB_APP_PRIVATE_KEY: 'private-key',
  GITHUB_APP_WEBHOOK_SECRET: 'webhook-secret',
});

describe('GitHubAppProvider', () => {
  it('should exchange credentials and normalize installation repositories', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'installation-token' }), {
          status: 201,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            repositories: [
              {
                id: 123456789,
                name: 'backend',
                full_name: 'forgeops/backend',
                private: true,
                default_branch: 'main',
                owner: {
                  login: 'forgeops',
                },
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
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-03-28T12:00:00.000Z'),
    });

    await expect(boundary.listInstallationRepositories()).resolves.toEqual([
      {
        githubRepoId: '123456789',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
        isPrivate: true,
      },
    ]);

    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(fetchImplementation).toHaveBeenNthCalledWith(
      1,
      'https://api.github.test/app/installations/78910/access_tokens',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
          Authorization: expect.stringMatching(/^Bearer /),
        }),
      }),
    );
    expect(fetchImplementation).toHaveBeenNthCalledWith(
      2,
      'https://api.github.test/installation/repositories?per_page=100',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer installation-token',
        }),
      }),
    );
  });

  it('should raise a safe discovery error when GitHub discovery fails', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: 'rate limited' }), {
        status: 403,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-03-28T12:00:00.000Z'),
    });

    await expect(boundary.listInstallationRepositories()).rejects.toBeInstanceOf(
      GitHubRepositoryDiscoveryError,
    );
    await expect(boundary.listInstallationRepositories()).rejects.toMatchObject({
      code: 'github_repository_discovery_unavailable',
      message: 'GitHub repository discovery is currently unavailable.',
      statusCode: 503,
    });
  });

  it('should exchange credentials and normalize repository workflows', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'installation-token' }), {
          status: 201,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workflows: [
              {
                id: 555,
                name: 'CI',
                path: '.github/workflows/ci.yml',
                state: 'active',
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
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-03-29T12:00:00.000Z'),
    });

    await expect(
      boundary.listRepositoryWorkflows({
        owner: 'forgeops',
        name: 'backend',
      }),
    ).resolves.toEqual([
      {
        githubWorkflowId: '555',
        name: 'CI',
        path: '.github/workflows/ci.yml',
        state: 'active',
        sourceType: 'local',
      },
    ]);

    expect(fetchImplementation).toHaveBeenNthCalledWith(
      2,
      'https://api.github.test/repos/forgeops/backend/actions/workflows?per_page=100',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer installation-token',
        }),
      }),
    );
  });

  it('should raise a safe workflow catalog error when workflow sync fails', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: 'rate limited' }), {
        status: 403,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-03-29T12:00:00.000Z'),
    });

    await expect(
      boundary.listRepositoryWorkflows({
        owner: 'forgeops',
        name: 'backend',
      }),
    ).rejects.toBeInstanceOf(GitHubWorkflowCatalogSyncError);
    await expect(
      boundary.listRepositoryWorkflows({
        owner: 'forgeops',
        name: 'backend',
      }),
    ).rejects.toMatchObject({
      code: 'github_workflow_catalog_unavailable',
      message: 'GitHub workflow catalog is currently unavailable.',
      statusCode: 503,
    });
  });

  it('should exchange credentials and normalize workflow runs', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'installation-token' }), {
          status: 201,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workflow_runs: [
              {
                id: 777,
                status: 'completed',
                conclusion: 'success',
                head_branch: 'main',
                head_sha: 'abc123def456',
                event: 'push',
                run_started_at: '2026-03-30T12:00:00.000Z',
                updated_at: '2026-03-30T12:05:00.000Z',
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
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-03-30T12:10:00.000Z'),
    });

    await expect(
      boundary.listWorkflowRuns(
        {
          owner: 'forgeops',
          name: 'backend',
        },
        '555',
      ),
    ).resolves.toEqual([
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
    ]);

    expect(fetchImplementation).toHaveBeenNthCalledWith(
      2,
      'https://api.github.test/repos/forgeops/backend/actions/workflows/555/runs?per_page=20',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer installation-token',
        }),
      }),
    );
  });

  it('should exchange credentials and normalize workflow run jobs', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'installation-token' }), {
          status: 201,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jobs: [
              {
                id: 888,
                name: 'lint',
                status: 'completed',
                conclusion: 'success',
                started_at: '2026-03-30T12:01:00.000Z',
                completed_at: '2026-03-30T12:02:00.000Z',
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
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-03-30T12:10:00.000Z'),
    });

    await expect(
      boundary.listWorkflowRunJobs(
        {
          owner: 'forgeops',
          name: 'backend',
        },
        '777',
      ),
    ).resolves.toEqual([
      {
        githubJobId: '888',
        name: 'lint',
        status: 'completed',
        conclusion: 'success',
        startedAt: new Date('2026-03-30T12:01:00.000Z'),
        finishedAt: new Date('2026-03-30T12:02:00.000Z'),
      },
    ]);

    expect(fetchImplementation).toHaveBeenNthCalledWith(
      2,
      'https://api.github.test/repos/forgeops/backend/actions/runs/777/jobs?per_page=100',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer installation-token',
        }),
      }),
    );
  });

  it('should raise a safe workflow runs sync error when run sync fails', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: 'rate limited' }), {
        status: 403,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-03-30T12:00:00.000Z'),
    });

    await expect(
      boundary.listWorkflowRuns(
        {
          owner: 'forgeops',
          name: 'backend',
        },
        '555',
      ),
    ).rejects.toBeInstanceOf(GitHubWorkflowRunsSyncError);
  });

  it('should exchange credentials and normalize pull requests', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'installation-token' }), {
          status: 201,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 9001,
              number: 42,
              title: 'Add pull request insights',
              state: 'open',
              merged_at: null,
              user: {
                login: 'alessandrolsdev',
              },
              base: {
                ref: 'main',
              },
              head: {
                ref: 'feature/pull-request-insights',
              },
            },
            {
              id: 9002,
              number: 43,
              title: 'Close flaky workflow gap',
              state: 'closed',
              merged_at: '2026-03-31T18:00:00.000Z',
              user: {
                login: 'codex-bot',
              },
              base: {
                ref: 'main',
              },
              head: {
                ref: 'feature/flaky-workflow-gap',
              },
            },
          ]),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-03-31T18:10:00.000Z'),
    });

    await expect(
      boundary.listPullRequests({
        owner: 'forgeops',
        name: 'backend',
      }),
    ).resolves.toEqual([
      {
        githubPrId: '9001',
        number: 42,
        title: 'Add pull request insights',
        state: 'open',
        author: 'alessandrolsdev',
        baseBranch: 'main',
        headBranch: 'feature/pull-request-insights',
      },
      {
        githubPrId: '9002',
        number: 43,
        title: 'Close flaky workflow gap',
        state: 'merged',
        author: 'codex-bot',
        baseBranch: 'main',
        headBranch: 'feature/flaky-workflow-gap',
      },
    ]);

    expect(fetchImplementation).toHaveBeenNthCalledWith(
      2,
      'https://api.github.test/repos/forgeops/backend/pulls?state=all&per_page=100&sort=updated&direction=desc',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer installation-token',
        }),
      }),
    );
  });

  it('should raise a safe pull request sync error when pull request sync fails', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: 'rate limited' }), {
        status: 403,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-03-31T18:00:00.000Z'),
    });

    await expect(
      boundary.listPullRequests({
        owner: 'forgeops',
        name: 'backend',
      }),
    ).rejects.toBeInstanceOf(GitHubPullRequestSyncError);
  });

  it('should exchange credentials and normalize pull request review comments', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'installation-token' }), {
          status: 201,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 7001,
              body: '[P1] Validar input da rota',
              path: 'src/api.ts',
              created_at: '2026-04-02T00:10:00.000Z',
              user: {
                login: 'codex-reviewer',
              },
            },
            {
              id: 7002,
              body: null,
              path: null,
              created_at: null,
              user: null,
            },
          ]),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-04-02T00:11:00.000Z'),
    });

    await expect(
      boundary.listPullRequestReviewComments(
        {
          owner: 'forgeops',
          name: 'backend',
        },
        42,
      ),
    ).resolves.toEqual([
      {
        githubReviewCommentId: '7001',
        reviewerLogin: 'codex-reviewer',
        body: '[P1] Validar input da rota',
        path: 'src/api.ts',
        createdAt: new Date('2026-04-02T00:10:00.000Z'),
      },
      {
        githubReviewCommentId: '7002',
        reviewerLogin: 'unknown',
        body: '',
        path: null,
        createdAt: null,
      },
    ]);

    expect(fetchImplementation).toHaveBeenNthCalledWith(
      2,
      'https://api.github.test/repos/forgeops/backend/pulls/42/comments?per_page=100',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer installation-token',
        }),
      }),
    );
  });

  it('should raise a safe pull request review sync error when review comment sync fails', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: 'rate limited' }), {
        status: 403,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-04-02T00:12:00.000Z'),
    });

    await expect(
      boundary.listPullRequestReviewComments(
        {
          owner: 'forgeops',
          name: 'backend',
        },
        42,
      ),
    ).rejects.toBeInstanceOf(GitHubPullRequestReviewSyncError);
  });

  it('should fail safely when GitHub returns an unsupported workflow run status', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'installation-token' }), {
          status: 201,
          headers: {
            'content-type': 'application/json',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workflow_runs: [
              {
                id: 777,
                status: 'mystery_status',
                conclusion: null,
                head_branch: 'main',
                head_sha: 'abc123def456',
                event: 'push',
                run_started_at: null,
                updated_at: '2026-03-30T12:05:00.000Z',
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
    const boundary = createGitHubAppBoundary(buildConfig(), {
      apiBaseUrl: 'https://api.github.test',
      fetchImplementation,
      appJwtFactory: () => 'app-jwt',
      now: () => new Date('2026-03-30T12:00:00.000Z'),
    });

    await expect(
      boundary.listWorkflowRuns(
        {
          owner: 'forgeops',
          name: 'backend',
        },
        '555',
      ),
    ).rejects.toBeInstanceOf(GitHubWorkflowRunsSyncError);
  });
});
