import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../../../src/app/create-server.js';

const toResponseHeaders = (headers: Record<string, string | string[] | number | undefined>) => {
  const normalized = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'undefined') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        normalized.append(key, item);
      }

      continue;
    }

    normalized.set(key, String(value));
  }

  return normalized;
};

const createBackendFetch = (server: ReturnType<typeof createServer>): typeof fetch => {
  return async (input, init) => {
    const rawUrl = input instanceof Request ? input.url : input.toString();
    const url = new URL(rawUrl);
    const headers = init?.headers
      ? Object.fromEntries(new Headers(init.headers).entries())
      : {};

    return new Promise((resolve, reject) => {
      server.inject(
        {
          method: 'GET',
          url: `${url.pathname}${url.search}`,
          headers,
        },
        (error, response) => {
          if (error) {
            reject(error);
            return;
          }

          if (!response) {
            reject(new Error('Fastify inject did not return a response.'));
            return;
          }

          resolve(
            new Response(response.payload, {
              status: response.statusCode,
              headers: toResponseHeaders(response.headers),
            }),
          );
        },
      );
    });
  };
};

describe('health contract', () => {
  let server: ReturnType<typeof createServer> | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('should keep the frontend health parser compatible with the real backend response', async () => {
    const { createApiClient } = await import(
      new URL('../../../../frontend/src/lib/api/client.ts', import.meta.url).href
    );

    server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      githubConfig: null,
    });

    const client = createApiClient({
      baseUrl: 'http://forgeops.local',
      fetcher: createBackendFetch(server),
    });

    await expect(client.getHealth()).resolves.toMatchObject({
      status: 'ok',
      service: 'forgeops-backend',
      environment: 'test',
      integrations: {
        github: {
          mode: 'github-app',
          configured: false,
        },
      },
    });
  });
});
