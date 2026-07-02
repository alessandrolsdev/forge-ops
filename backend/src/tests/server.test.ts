import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../app/create-server.js';
import { resolveRuntimeServerOptions } from '../server.js';

const encodeBase64Url = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url');

const signSharedSecretToken = (payload: Record<string, unknown>, secret: string): string => {
  const encodedHeader = encodeBase64Url(
    JSON.stringify({
      alg: 'HS256',
      typ: 'JWT',
    }),
  );
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
};

const createRuntimeTestServer = (env: NodeJS.ProcessEnv) =>
  createServer({
    ...resolveRuntimeServerOptions(env),
    repositoryRegistryRepository: {
      list: async () => [],
      findById: async () => null,
      create: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      deleteById: async () => undefined,
    },
    workflowCatalogRepository: {
      create: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      upsert: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      listByRepositoryId: async () => [],
      findById: async () => null,
    },
    workflowRunRepository: {
      createRun: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      upsertRun: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      listRunsByWorkflowId: async () => [],
      listRecentCompletedRunsByRepositoryId: async () => [],
      findRunById: async () => null,
      createJob: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      upsertJob: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      listJobsByWorkflowRunId: async () => [],
    },
    pullRequestRepository: {
      create: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      upsert: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      listByRepositoryId: async () => [],
      findById: async () => null,
    },
    codexReviewSummaryRepository: {
      create: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      upsert: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      findByPullRequestId: async () => null,
      listByRepositoryId: async () => [],
    },
    policyCheckRepository: {
      upsert: async () => {
        throw new Error('Not implemented in runtime bootstrap test.');
      },
      listByRepositoryId: async () => [],
    },
  });

describe('resolveRuntimeServerOptions', () => {
  afterEach(async () => {
    // explicit lifecycle placeholder
  });

  it('should keep protected routes degraded when auth is not configured', async () => {
    const server = createRuntimeTestServer({
      NODE_ENV: 'test',
      PORT: '3333',
      LOG_LEVEL: 'silent',
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

  it('should keep CORS preflight available even when operator auth is not configured', async () => {
    const server = createRuntimeTestServer({
      NODE_ENV: 'test',
      PORT: '3333',
      LOG_LEVEL: 'silent',
    });

    const response = await server.inject({
      method: 'OPTIONS',
      url: '/api/v1/repositories',
      headers: {
        origin: 'http://forgeops.local:8082',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://forgeops.local:8082',
    );
    expect(response.headers['access-control-allow-headers']).toContain('authorization');

    await server.close();
  });

  it('should keep CORS headers on protected responses even when auth is not configured', async () => {
    const server = createRuntimeTestServer({
      NODE_ENV: 'test',
      PORT: '3333',
      LOG_LEVEL: 'silent',
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/repositories',
      headers: {
        origin: 'http://forgeops.local:8082',
        authorization: 'Bearer token',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://forgeops.local:8082',
    );
    expect(response.json()).toEqual({
      error: {
        code: 'auth_not_configured',
        message: 'Operator authentication is not configured.',
      },
    });

    await server.close();
  });

  it('should wire a runtime auth verifier when shared-secret auth is configured', async () => {
    const server = createRuntimeTestServer({
      NODE_ENV: 'test',
      PORT: '3333',
      LOG_LEVEL: 'silent',
      OPERATOR_AUTH_ENABLED: 'true',
      OPERATOR_AUTH_ISSUER: 'https://forgeops.local',
      OPERATOR_AUTH_AUDIENCE: 'forgeops-api',
      OPERATOR_AUTH_MODE: 'shared-secret',
      OPERATOR_AUTH_SHARED_SECRET: 'local-secret',
    });
    const token = signSharedSecretToken(
      {
        iss: 'https://forgeops.local',
        aud: 'forgeops-api',
        sub: 'operator:trusted-token',
        email: 'operator@forgeops.dev',
        capabilities: ['repositories:read'],
        exp: Math.floor(Date.now() / 1000) + 300,
      },
      'local-secret',
    );

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${token}`,
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
});
