import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../../app/create-server.js';

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
      githubConfig: null,
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/health',
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
      githubConfig: null,
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
});
