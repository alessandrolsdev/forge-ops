import Fastify from 'fastify';
import { registerRoutes } from './register-routes.js';
import type { AppEnv } from '../infra/config/app-env.js';
import type { OperatorAuthEnv } from '../infra/config/auth-env.js';
import type { GitHubAppEnv } from '../infra/config/github-app-env.js';
import { createLogger } from '../infra/logger/create-logger.js';
import { createErrorHandler } from '../infra/http/error-handler.js';
import { createGitHubAppBoundary } from '../modules/github/github-app.boundary.js';
import { StaticHealthRepository } from '../modules/health/health.repository.js';
import { HealthService } from '../modules/health/health.service.js';

export interface CreateServerOptions {
  env: AppEnv;
  authConfig?: OperatorAuthEnv | null;
  githubConfig?: GitHubAppEnv | null;
}

export const createServer = (options: CreateServerOptions) => {
  const app = Fastify({
    logger: createLogger(options.env.LOG_LEVEL),
  });

  app.decorateRequest('operatorPrincipal', null);

  const githubBoundary = createGitHubAppBoundary(options.githubConfig ?? null);
  const healthRepository = new StaticHealthRepository({
    environment: options.env.NODE_ENV,
  });
  const healthService = new HealthService({
    githubBoundary,
    repository: healthRepository,
  });

  app.setErrorHandler(createErrorHandler(app.log));
  registerRoutes(app, {
    healthService,
  });

  return app;
};
