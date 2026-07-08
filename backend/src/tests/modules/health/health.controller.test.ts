import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { createErrorHandler } from '../../../infra/http/error-handler.js';
import { createLogger } from '../../../infra/logger/create-logger.js';
import {
  registerHealthRoutes,
  type HealthRouteService,
} from '../../../modules/health/health.controller.js';
import type { HealthSnapshot } from '../../../modules/health/health.service.js';

describe('registerHealthRoutes', () => {
  it('should return the health snapshot for valid requests', async () => {
    const snapshot: HealthSnapshot = {
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
    };

    const healthService: HealthRouteService = {
      getSnapshot: vi.fn(() => snapshot),
    };

    const app = Fastify({
      loggerInstance: createLogger('silent'),
    });

    app.setErrorHandler(createErrorHandler(app.log));
    registerHealthRoutes(app, healthService);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health?verbose=true',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      environment: 'test',
    });
    expect(healthService.getSnapshot).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('should reject invalid querystring values', async () => {
    const healthService: HealthRouteService = {
      getSnapshot: vi.fn(() => {
        throw new Error('getSnapshot should not be called for invalid requests');
      }),
    };

    const app = Fastify({
      loggerInstance: createLogger('silent'),
    });

    app.setErrorHandler(createErrorHandler(app.log));
    registerHealthRoutes(app, healthService);

    const response = await app.inject({
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
    expect(healthService.getSnapshot).not.toHaveBeenCalled();

    await app.close();
  });
});
