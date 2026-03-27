import { describe, expect, it } from 'vitest';
import { createGitHubAppBoundary } from '../../../modules/github/github-app.boundary.js';
import { StaticHealthRepository } from '../../../modules/health/health.repository.js';
import { HealthService } from '../../../modules/health/health.service.js';

describe('HealthService', () => {
  it('should build a deterministic snapshot', () => {
    const service = new HealthService({
      githubBoundary: createGitHubAppBoundary(null),
      repository: new StaticHealthRepository({
        environment: 'test',
        now: () => new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    expect(service.getSnapshot()).toEqual({
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
    });
  });
});
