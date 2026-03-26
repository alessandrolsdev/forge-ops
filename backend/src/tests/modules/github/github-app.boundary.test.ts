import { describe, expect, it } from 'vitest';
import { createGitHubAppBoundary } from '../../../modules/github/github-app.boundary.js';

describe('createGitHubAppBoundary', () => {
  it('should expose a safe status summary when configured', () => {
    const boundary = createGitHubAppBoundary({
      GITHUB_APP_ID: '12345678',
      GITHUB_APP_INSTALLATION_ID: '87654321',
      GITHUB_APP_PRIVATE_KEY: 'private-key',
      GITHUB_APP_WEBHOOK_SECRET: 'secret',
    });

    expect(boundary.getStatus()).toEqual({
      mode: 'github-app',
      configured: true,
      appId: '12****78',
      installationId: '87****21',
      webhookConfigured: true,
    });
  });

  it('should fail fast when the boundary is used without configuration', async () => {
    const boundary = createGitHubAppBoundary(null);

    expect(() => boundary.assertConfigured()).toThrowError();
    await expect(boundary.listInstallationRepositories()).rejects.toThrowError();
  });
});

