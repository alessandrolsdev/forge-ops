import { describe, expect, it, vi } from 'vitest';
import { createGitHubAppBoundary } from '../../../modules/github/github-app.boundary.js';
import { GitHubRepositoryDiscoveryError } from '../../../modules/github/github-app.errors.js';

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
});
