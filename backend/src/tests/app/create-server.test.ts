import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../../app/create-server.js';
import { GitHubRepositoryDiscoveryError } from '../../modules/github/github-app.errors.js';
import { RepositoryAlreadyExistsError } from '../../modules/repository-registry/repository.errors.js';
import { createOperatorPrincipal } from '../../shared/auth/operator-principal.js';
import type {
  CreateRepositoryInput,
  Repository,
} from '../../modules/repository-registry/repository.entity.js';
import type { GitHubInstallationRepository } from '../../modules/github/github-app.boundary.js';

const buildRepository = (
  overrides: Partial<Repository> = {},
): Repository => {
  const createdAt = new Date('2026-03-27T16:45:00.000Z');

  return {
    id: 'repo_123',
    githubRepoId: '123456789',
    owner: 'forgeops',
    name: 'backend',
    fullName: 'forgeops/backend',
    defaultBranch: 'main',
    isActive: true,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const buildCreateRepositoryInput = (
  overrides: Partial<CreateRepositoryInput> = {},
): CreateRepositoryInput => {
  return {
    githubRepoId: '123456789',
    owner: 'forgeops',
    name: 'backend',
    fullName: 'forgeops/backend',
    defaultBranch: 'main',
    ...overrides,
  };
};

const buildInstallationRepository = (
  overrides: Partial<GitHubInstallationRepository> = {},
): GitHubInstallationRepository => {
  return {
    githubRepoId: '123456789',
    owner: 'forgeops',
    name: 'backend',
    fullName: 'forgeops/backend',
    defaultBranch: 'main',
    isPrivate: true,
    ...overrides,
  };
};

const createProtectedServer = (overrides?: {
  repositories?: Repository[];
  createRepository?: (input: CreateRepositoryInput) => Promise<Repository>;
  installationRepositories?: GitHubInstallationRepository[];
  installationDiscoveryError?: Error;
  capabilities?: string[];
}) => {
  const repositories = overrides?.repositories ?? [];

  return createServer({
    env: {
      NODE_ENV: 'test',
      PORT: 3333,
      LOG_LEVEL: 'silent',
    },
    authConfig: {
      issuer: 'https://forgeops.example.com',
      audience: 'forgeops-api',
      verifierSource: {
        type: 'shared-secret',
        sharedSecret: 'secret',
      },
    },
    authVerifier: {
      verify: async ({ token }) =>
        createOperatorPrincipal({
          subject: `operator:${token}`,
          email: 'operator@forgeops.dev',
          capabilities:
            overrides?.capabilities ?? ['repositories:read', 'repositories:write'],
        }),
    },
    githubConfig: null,
    githubBoundary: {
      mode: 'github-app',
      configured: true,
      getStatus: () => ({
        mode: 'github-app',
        configured: true,
        appId: '12****56',
        installationId: '78****10',
        webhookConfigured: true,
      }),
      assertConfigured: () => undefined,
      listInstallationRepositories: async () => {
        if (overrides?.installationDiscoveryError) {
          throw overrides.installationDiscoveryError;
        }

        return overrides?.installationRepositories ?? [];
      },
      listRepositoryWorkflows: async () => [],
    },
    repositoryRegistryRepository: {
      list: async () => repositories,
      findById: async (id) => repositories.find((repository) => repository.id === id) ?? null,
      create:
        overrides?.createRepository ??
        (async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          })),
    },
  });
};

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
      authConfig: null,
      authVerifier: null,
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/health?verbose=true',
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
      authConfig: null,
      authVerifier: null,
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
      },
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

  it('should decorate requests with an operator principal context slot', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: null,
      authVerifier: null,
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
      },
    });

    expect(server.hasRequestDecorator('operatorPrincipal')).toBe(true);

    await server.close();
  });

  it('should reject protected routes without authentication', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: {
        issuer: 'https://forgeops.example.com',
        audience: 'forgeops-api',
        verifierSource: {
          type: 'shared-secret',
          sharedSecret: 'secret',
        },
      },
      authVerifier: {
        verify: async () => {
          throw new Error('This should not run without a token.');
        },
      },
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'authentication_required',
        message: 'Authentication is required.',
      },
    });

    await server.close();
  });

  it('should fail safely when protected auth dependencies are missing', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: null,
      authVerifier: null,
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: 'Bearer token',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: 'auth_not_configured',
        message: 'Operator authentication is not configured.',
      },
    });

    await server.close();
  });

  it('should allow protected routes with a verified operator principal', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: {
        issuer: 'https://forgeops.example.com',
        audience: 'forgeops-api',
        verifierSource: {
          type: 'shared-secret',
          sharedSecret: 'secret',
        },
      },
      authVerifier: {
        verify: async ({ token }) =>
          createOperatorPrincipal({
            subject: `operator:${token}`,
            email: 'operator@forgeops.dev',
            capabilities: ['repositories:read'],
          }),
      },
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      principal: {
        kind: 'operator',
        subject: 'operator:trusted-token',
        email: 'operator@forgeops.dev',
        displayName: null,
        capabilities: ['repositories:read'],
      },
    });

    await server.close();
  });

  it('should return a safe authentication error when token verification fails', async () => {
    const server = createServer({
      env: {
        NODE_ENV: 'test',
        PORT: 3333,
        LOG_LEVEL: 'silent',
      },
      authConfig: {
        issuer: 'https://forgeops.example.com',
        audience: 'forgeops-api',
        verifierSource: {
          type: 'shared-secret',
          sharedSecret: 'secret',
        },
      },
      authVerifier: {
        verify: async () => {
          throw new Error('Invalid signature details');
        },
      },
      githubConfig: null,
      repositoryRegistryRepository: {
        list: async () => [],
        findById: async () => null,
        create: async (input) =>
          buildRepository({
            githubRepoId: input.githubRepoId,
            owner: input.owner,
            name: input.name,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            isActive: input.isActive ?? true,
          }),
      },
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'authentication_required',
        message: 'Authentication failed.',
      },
    });

    await server.close();
  });

  it('should list repositories for an authenticated operator', async () => {
    const server = createProtectedServer({
      repositories: [],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      repositories: [],
    });

    await server.close();
  });

  it('should reject invalid repository payloads before service execution', async () => {
    const server = createProtectedServer();

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
      payload: {
        githubRepoId: '',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'validation_error',
        message:
          'String must contain at least 1 character(s); Required; Required; Required; Required',
      },
    });

    await server.close();
  });

  it('should create a repository for an authenticated operator', async () => {
    const server = createProtectedServer();

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
      payload: buildCreateRepositoryInput(),
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      repository: {
        id: 'repo_123',
        githubRepoId: '123456789',
        owner: 'forgeops',
        name: 'backend',
        fullName: 'forgeops/backend',
        defaultBranch: 'main',
        isActive: true,
        createdAt: '2026-03-27T16:45:00.000Z',
        updatedAt: '2026-03-27T16:45:00.000Z',
      },
    });

    await server.close();
  });

  it('should return a consistent conflict response when the repository already exists', async () => {
    const server = createProtectedServer({
      createRepository: async () => {
        throw new RepositoryAlreadyExistsError();
      },
    });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
      payload: buildCreateRepositoryInput(),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: 'repository_already_exists',
        message: 'Repository is already monitored.',
      },
    });

    await server.close();
  });

  it('should forbid repository creation without the write capability', async () => {
    const server = createProtectedServer({
      capabilities: ['repositories:read'],
    });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/repositories',
      headers: {
        authorization: 'Bearer trusted-token',
      },
      payload: buildCreateRepositoryInput(),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        code: 'forbidden',
        message: 'You are not allowed to perform this action.',
      },
    });

    await server.close();
  });

  it('should keep repository routes protected', async () => {
    const server = createProtectedServer();

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: 'authentication_required',
        message: 'Authentication is required.',
      },
    });

    await server.close();
  });

  it('should list discoverable installation repositories for an authenticated operator', async () => {
    const server = createProtectedServer({
      installationRepositories: [
        buildInstallationRepository(),
        buildInstallationRepository({
          githubRepoId: '987654321',
          name: 'frontend',
          fullName: 'forgeops/frontend',
          isPrivate: false,
        }),
      ],
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/discovery',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      repositories: [
        buildInstallationRepository(),
        buildInstallationRepository({
          githubRepoId: '987654321',
          name: 'frontend',
          fullName: 'forgeops/frontend',
          isPrivate: false,
        }),
      ],
    });

    await server.close();
  });

  it('should return a safe error when repository discovery fails', async () => {
    const server = createProtectedServer({
      installationDiscoveryError: new GitHubRepositoryDiscoveryError(),
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories/discovery',
      headers: {
        authorization: 'Bearer trusted-token',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: 'github_repository_discovery_unavailable',
        message: 'GitHub repository discovery is currently unavailable.',
      },
    });

    await server.close();
  });
});
