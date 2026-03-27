import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '@/lib/api/client';

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
});

