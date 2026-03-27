import type { FastifyRequest } from 'fastify';
import type { OperatorAuthEnv } from '../config/auth-env.js';
import type { OperatorAuthVerifier } from '../../shared/auth/operator-auth-verifier.js';
import { ApplicationError } from '../../shared/errors/application-error.js';
import { AuthenticationError } from '../../shared/errors/authentication-error.js';
import { AuthConfigurationError } from '../../shared/errors/auth-configuration-error.js';

const getAccessMode = (request: FastifyRequest): 'public' | 'protected' => {
  return request.routeOptions.config.access ?? 'protected';
};

const getBearerToken = (request: FastifyRequest): string => {
  const header = request.headers.authorization;

  if (!header) {
    throw new AuthenticationError();
  }

  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token || token.trim().length === 0) {
    throw new AuthenticationError('A valid bearer token is required.');
  }

  return token.trim();
};

export interface CreateAuthGuardOptions {
  authConfig: OperatorAuthEnv | null;
  authVerifier?: OperatorAuthVerifier | null;
}

export const createAuthGuard =
  ({ authConfig, authVerifier }: CreateAuthGuardOptions) =>
  async (request: FastifyRequest): Promise<void> => {
    request.operatorPrincipal = null;

    if (getAccessMode(request) === 'public') {
      return;
    }

    if (!authConfig || !authVerifier) {
      throw new AuthConfigurationError();
    }

    const token = getBearerToken(request);

    try {
      request.operatorPrincipal = await authVerifier.verify({ token });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new AuthenticationError('Authentication failed.');
    }
  };
