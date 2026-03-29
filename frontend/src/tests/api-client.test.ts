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
              code: 'forbidden',
              message: 'You are not allowed to perform this action.',
            },
          }),
          {
            status: 403,
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
      new ApiClientError('You are not allowed to perform this action.', 403, 'forbidden'),
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

