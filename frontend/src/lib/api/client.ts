import { z } from 'zod';
import { getApiBaseUrl } from '../config/public-env';

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

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

const monitoredRepositorySchema = z.object({
  id: z.string().min(1),
  githubRepoId: z.string().min(1),
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
  defaultBranch: z.string().min(1),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const monitoredRepositoriesResponseSchema = z.object({
  repositories: z.array(monitoredRepositorySchema),
});

const repositoryDiscoveryItemSchema = z.object({
  githubRepoId: z.string().min(1),
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
  defaultBranch: z.string().min(1),
  isPrivate: z.boolean(),
});

const repositoryDiscoveryResponseSchema = z.object({
  repositories: z.array(repositoryDiscoveryItemSchema),
});

const createRepositoryInputSchema = z.object({
  githubRepoId: z.string().min(1),
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
  defaultBranch: z.string().min(1),
  isActive: z.boolean().optional(),
});

const createRepositoryResponseSchema = z.object({
  repository: monitoredRepositorySchema,
});

export type MonitoredRepository = z.infer<typeof monitoredRepositorySchema>;
export type RepositoryDiscoveryItem = z.infer<typeof repositoryDiscoveryItemSchema>;
export type CreateRepositoryInput = z.infer<typeof createRepositoryInputSchema>;

interface CreateApiClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null = null,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

export interface ForgeOpsApiClient {
  getHealth(): Promise<BackendHealthResponse>;
  getRepositories(accessToken: string): Promise<MonitoredRepository[]>;
  getRepositoryDiscovery(accessToken: string): Promise<RepositoryDiscoveryItem[]>;
  createRepository(
    accessToken: string,
    input: CreateRepositoryInput,
  ): Promise<MonitoredRepository>;
}

const createApiError = async (response: Response, fallbackMessage: string) => {
  try {
    const payload = apiErrorSchema.parse(await response.json());
    return new ApiClientError(payload.error.message, response.status, payload.error.code);
  } catch {
    return new ApiClientError(fallbackMessage, response.status);
  }
};

export const createApiClient = (options: CreateApiClientOptions = {}): ForgeOpsApiClient => {
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? getApiBaseUrl());
  const buildHeaders = (accessToken?: string, contentType?: string) => ({
    accept: 'application/json',
    ...(contentType ? { 'content-type': contentType } : {}),
    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
  });

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

    async getRepositories(accessToken: string): Promise<MonitoredRepository[]> {
      const response = await fetcher(`${baseUrl}/api/v1/repositories`, {
        headers: buildHeaders(accessToken),
      });

      if (!response.ok) {
        throw await createApiError(response, `Failed to fetch repositories (${response.status})`);
      }

      return monitoredRepositoriesResponseSchema.parse(await response.json()).repositories;
    },

    async getRepositoryDiscovery(accessToken: string): Promise<RepositoryDiscoveryItem[]> {
      const response = await fetcher(`${baseUrl}/api/v1/repositories/discovery`, {
        headers: buildHeaders(accessToken),
      });

      if (!response.ok) {
        throw await createApiError(
          response,
          `Failed to fetch repository discovery (${response.status})`,
        );
      }

      return repositoryDiscoveryResponseSchema.parse(await response.json()).repositories;
    },

    async createRepository(
      accessToken: string,
      input: CreateRepositoryInput,
    ): Promise<MonitoredRepository> {
      const payload = createRepositoryInputSchema.parse(input);
      const response = await fetcher(`${baseUrl}/api/v1/repositories`, {
        method: 'POST',
        headers: buildHeaders(accessToken, 'application/json'),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw await createApiError(response, `Failed to create repository (${response.status})`);
      }

      return createRepositoryResponseSchema.parse(await response.json()).repository;
    },
  };
};

