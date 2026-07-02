import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
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
import { PrismaWorkflowRunRepository } from '../modules/workflow-runs/workflow-run.prisma-repository.js';
import type { WorkflowRunRepository } from '../modules/workflow-runs/workflow-run.repository.js';
import { WorkflowRunService } from '../modules/workflow-runs/workflow-run.service.js';
import { PrismaPullRequestRepository } from '../modules/pull-request-insights/pull-request.prisma-repository.js';
import type { PullRequestRepository } from '../modules/pull-request-insights/pull-request.repository.js';
import { PullRequestService } from '../modules/pull-request-insights/pull-request.service.js';
import { PrismaCodexReviewSummaryRepository } from '../modules/pull-request-insights/codex-review-summary.prisma-repository.js';
import { CodexReviewSummaryService } from '../modules/pull-request-insights/codex-review-summary.service.js';
import type { CodexReviewSummaryRepository } from '../modules/pull-request-insights/codex-review-summary.repository.js';
import { PrismaPolicyCheckRepository } from '../modules/policy-engine/policy-check.prisma-repository.js';
import type { PolicyCheckRepository } from '../modules/policy-engine/policy-check.repository.js';
import { PolicyCheckService } from '../modules/policy-engine/policy-check.service.js';
import { AutomationHealthService } from '../modules/automation-health/automation-health.service.js';
import { PrismaSyncEventRepository } from '../modules/audit-sync/sync-event.prisma-repository.js';
import type { SyncEventRepository } from '../modules/audit-sync/sync-event.repository.js';
import { SyncEventService } from '../modules/audit-sync/sync-event.service.js';
import type { OperatorAuthVerifier } from '../shared/auth/operator-auth-verifier.js';

const localCorsOrigins = [
  /^http:\/\/forgeops\.local(?::\d+)?$/,
  /^http:\/\/docker-frontend\.forgeops\.local(?::\d+)?$/,
  /^http:\/\/localhost(?::\d+)?$/,
];

const isAllowedLocalCorsOrigin = (
  origin: string | undefined,
): origin is string => {
  return typeof origin === 'string' && localCorsOrigins.some((pattern) => pattern.test(origin));
};

const appendVaryHeader = (reply: FastifyReply, value: string): void => {
  const currentHeader = reply.getHeader('Vary');

  if (typeof currentHeader !== 'string' || currentHeader.length === 0) {
    reply.header('Vary', value);
    return;
  }

  const values = currentHeader
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (!values.includes(value)) {
    values.push(value);
    reply.header('Vary', values.join(', '));
  }
};

const applyLocalCorsHeaders = (
  request: FastifyRequest,
  reply: FastifyReply,
): void => {
  const origin = request.headers.origin;

  if (!isAllowedLocalCorsOrigin(origin)) {
    return;
  }

  reply.header('Access-Control-Allow-Origin', origin);
  appendVaryHeader(reply, 'Origin');
};

const applyLocalPreflightHeaders = (
  request: FastifyRequest,
  reply: FastifyReply,
): void => {
  applyLocalCorsHeaders(request, reply);

  const requestedHeaders = request.headers['access-control-request-headers'];

  reply.header('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  reply.header(
    'Access-Control-Allow-Headers',
    typeof requestedHeaders === 'string' && requestedHeaders.trim().length > 0
      ? requestedHeaders
      : 'authorization, content-type',
  );
  reply.header('Access-Control-Max-Age', '600');
  appendVaryHeader(reply, 'Access-Control-Request-Headers');
};

export interface CreateServerOptions {
  env: AppEnv;
  authConfig?: OperatorAuthEnv | null;
  authVerifier?: OperatorAuthVerifier | null;
  githubConfig?: GitHubAppEnv | null;
  githubBoundary?: GitHubAppBoundary;
  repositoryRegistryRepository?: RepositoryRepository;
  workflowCatalogRepository?: WorkflowRepository;
  workflowRunRepository?: WorkflowRunRepository;
  pullRequestRepository?: PullRequestRepository;
  codexReviewSummaryRepository?: CodexReviewSummaryRepository;
  policyCheckRepository?: PolicyCheckRepository;
  syncEventRepository?: SyncEventRepository;
}

export const createServer = (options: CreateServerOptions) => {
  const app = Fastify({
    logger: createLogger(options.env.LOG_LEVEL),
  });

  app.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'OPTIONS') {
      return;
    }

    applyLocalPreflightHeaders(request, reply);
    reply.status(204).send();
  });

  app.addHook('onSend', async (request, reply, payload) => {
    applyLocalCorsHeaders(request, reply);
    return payload;
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
    options.repositoryRegistryRepository &&
    options.workflowCatalogRepository &&
    options.workflowRunRepository &&
    options.pullRequestRepository &&
    options.codexReviewSummaryRepository &&
    options.policyCheckRepository &&
    options.syncEventRepository
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
  const workflowRunRepository =
    options.workflowRunRepository ??
    new PrismaWorkflowRunRepository({
      workflowRun: prismaClient!.workflowRun,
      workflowJob: prismaClient!.workflowJob,
    });
  const pullRequestRepository =
    options.pullRequestRepository ??
    new PrismaPullRequestRepository(prismaClient!.pullRequest);
  const codexReviewSummaryRepository =
    options.codexReviewSummaryRepository ??
    new PrismaCodexReviewSummaryRepository(prismaClient!.codexReviewSummary);
  const policyCheckRepository =
    options.policyCheckRepository ??
    new PrismaPolicyCheckRepository(prismaClient!.policyCheck);
  const syncEventRepository =
    options.syncEventRepository ??
    new PrismaSyncEventRepository(prismaClient!.syncEvent);
  const syncEventService = new SyncEventService({
    repositoryRegistryRepository,
    syncEventRepository,
    logger: app.log,
  });
  const healthService = new HealthService({
    githubBoundary,
    repository: healthRepository,
  });
  const workflowService = new WorkflowService({
    repositoryRegistryRepository,
    workflowRepository: workflowCatalogRepository,
    githubBoundary,
    syncEventRecorder: syncEventService,
    logger: app.log,
  });
  const workflowRunService = new WorkflowRunService({
    repositoryRegistryRepository,
    workflowRepository: workflowCatalogRepository,
    workflowRunRepository,
    githubBoundary,
    syncEventRecorder: syncEventService,
    logger: app.log,
  });
  const pullRequestService = new PullRequestService({
    repositoryRegistryRepository,
    pullRequestRepository,
    githubBoundary,
    workflowRepository: workflowCatalogRepository,
    workflowRunRepository,
    codexReviewSummaryRepository,
    codexReviewSummaryService: new CodexReviewSummaryService({
      repositoryRegistryRepository,
      pullRequestRepository,
      codexReviewSummaryRepository,
      githubBoundary,
      syncEventRecorder: syncEventService,
      logger: app.log,
    }),
    syncEventRecorder: syncEventService,
    logger: app.log,
  });
  const policyCheckService = new PolicyCheckService({
    repositoryRegistryRepository,
    workflowRepository: workflowCatalogRepository,
    codexReviewSummaryRepository,
    policyCheckRepository,
    syncEventRecorder: syncEventService,
    logger: app.log,
  });
  const automationHealthService = new AutomationHealthService({
    repositoryRegistryRepository,
    workflowRepository: workflowCatalogRepository,
    workflowRunRepository,
    pullRequestRepository,
    codexReviewSummaryRepository,
    logger: app.log,
  });
  const repositoryService = new RepositoryService({
    repository: repositoryRegistryRepository,
    githubBoundary,
    workflowCatalogSync: workflowService,
    workflowRunSync: workflowRunService,
    pullRequestSync: pullRequestService,
    syncEventRecorder: syncEventService,
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
    workflowRunService,
    pullRequestService,
    policyCheckService,
    automationHealthService,
    syncEventService,
  });

  return app;
};
