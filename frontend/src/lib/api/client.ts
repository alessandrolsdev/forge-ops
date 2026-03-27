import { z } from 'zod';
import { getApiBaseUrl } from '../config/public-env';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('forgeops-backend'),
  timestamp: z.string().datetime(),
  environment: z.enum(['development', 'test', 'production']),
  integrations: z.object({
    github: z.object({
      mode: z.literal('github-app'),
      configured: z.boolean(),
      appId: z.string().nullable(),
      installationId: z.string().nullable(),
      webhookConfigured: z.boolean(),
    }),
  }),
});

export type BackendHealthResponse = z.infer<typeof healthResponseSchema>;

interface CreateApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

export const createApiClient = (options: CreateApiClientOptions = {}) => {
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? getApiBaseUrl());

  return {
    async getHealth(): Promise<BackendHealthResponse> {
      const response = await fetcher(`${baseUrl}/api/v1/health`, {
        headers: {
          accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch backend health (${response.status})`);
      }

      return healthResponseSchema.parse(await response.json());
    },
  };
};

