import Fastify from 'fastify';
import { registerRoutes } from './register-routes.js';
import type { AppEnv } from '../infra/config/app-env.js';
import type { OperatorAuthEnv } from '../infra/config/auth-env.js';
import type { GitHubAppEnv } from '../infra/config/github-app-env.js';
import { createAuthGuard } from '../infra/http/auth-guard.js';
import { createLogger } from '../infra/logger/create-logger.js';
import { createErrorHandler } from '../infra/http/error-handler.js';
import { createPrismaClient } from '../infra/persistence/prisma-client.js';
import {
  createGitHubAppBoundary,
  type GitHubAppBoundary,
} from '../modules/github/github-app.boundary.js';
import { StaticHealthRepository } from '../modules/health/health.repository.js';
import { HealthService } from '../modules/health/health.service.js';
import { PrismaRepositoryRepository } from '../modules/repository-registry/repository.prisma-repository.js';
import type { RepositoryRepository } from '../modules/repository-registry/repository.repository.js';
import { RepositoryService } from '../modules/repository-registry/repository.service.js';
import { PrismaWorkflowRepository } from '../modules/workflow-catalog/workflow.prisma-repository.js';
import type { WorkflowRepository } from '../modules/workflow-catalog/workflow.repository.js';
import { WorkflowService } from '../modules/workflow-catalog/workflow.service.js';
import type { OperatorAuthVerifier } from '../shared/auth/operator-auth-verifier.js';

export interface CreateServerOptions {
  env: AppEnv;
  authConfig?: OperatorAuthEnv | null;
  authVerifier?: OperatorAuthVerifier | null;
  githubConfig?: GitHubAppEnv | null;
  githubBoundary?: GitHubAppBoundary;
  repositoryRegistryRepository?: RepositoryRepository;
  workflowCatalogRepository?: WorkflowRepository;
}

export const createServer = (options: CreateServerOptions) => {
  const app = Fastify({
    logger: createLogger(options.env.LOG_LEVEL),
  });

  app.decorateRequest('operatorPrincipal', null);
  app.addHook(
    'onRequest',
    createAuthGuard({
      authConfig: options.authConfig ?? null,
      authVerifier: options.authVerifier ?? null,
    }),
  );

  const prismaClient =
    options.repositoryRegistryRepository && options.workflowCatalogRepository
      ? null
      : createPrismaClient();
  const githubBoundary =
    options.githubBoundary ?? createGitHubAppBoundary(options.githubConfig ?? null);
  const healthRepository = new StaticHealthRepository({
    environment: options.env.NODE_ENV,
  });
  const repositoryRegistryRepository =
    options.repositoryRegistryRepository ??
    new PrismaRepositoryRepository(prismaClient!.repository);
  const workflowCatalogRepository =
    options.workflowCatalogRepository ??
    new PrismaWorkflowRepository(prismaClient!.workflow);
  const healthService = new HealthService({
    githubBoundary,
    repository: healthRepository,
  });
  const repositoryService = new RepositoryService({
    repository: repositoryRegistryRepository,
    githubBoundary,
    logger: app.log,
  });
  const workflowService = new WorkflowService({
    repositoryRegistryRepository,
    workflowRepository: workflowCatalogRepository,
    githubBoundary,
    logger: app.log,
  });

  if (prismaClient) {
    app.addHook('onClose', async () => {
      await prismaClient.$disconnect();
    });
  }

  app.setErrorHandler(createErrorHandler(app.log));
  registerRoutes(app, {
    healthService,
    repositoryService,
    workflowService,
  });

  return app;
};
