import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../../app/create-server.js';
import { createOperatorPrincipal } from '../../shared/auth/operator-principal.js';

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
});
