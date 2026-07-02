import type {
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import type { Logger } from 'pino';
import type { HealthService } from '../modules/health/health.service.js';
import { registerAuthReferenceRoutes } from '../modules/auth/auth-reference.controller.js';
import { registerHealthRoutes } from '../modules/health/health.controller.js';
import { registerRepositoryRegistryRoutes } from '../modules/repository-registry/repository.controller.js';
import type { RepositoryService } from '../modules/repository-registry/repository.service.js';
import { registerWorkflowCatalogRoutes } from '../modules/workflow-catalog/workflow.controller.js';
import type { WorkflowService } from '../modules/workflow-catalog/workflow.service.js';
import { registerWorkflowRunRoutes } from '../modules/workflow-runs/workflow-run.controller.js';
import type { WorkflowRunService } from '../modules/workflow-runs/workflow-run.service.js';
import { registerPullRequestRoutes } from '../modules/pull-request-insights/pull-request.controller.js';
import type { PullRequestService } from '../modules/pull-request-insights/pull-request.service.js';
import { registerPolicyEngineRoutes } from '../modules/policy-engine/policy-check.controller.js';
import type { PolicyCheckService } from '../modules/policy-engine/policy-check.service.js';
import { registerAutomationHealthRoutes } from '../modules/automation-health/automation-health.controller.js';
import type { AutomationHealthService } from '../modules/automation-health/automation-health.service.js';

interface RegisterRoutesOptions {
  healthService: HealthService;
  repositoryService: RepositoryService;
  workflowService: WorkflowService;
  workflowRunService: WorkflowRunService;
  pullRequestService: PullRequestService;
  policyCheckService: PolicyCheckService;
  automationHealthService: AutomationHealthService;
}

export type ForgeOpsFastifyInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  Logger
>;

export const registerRoutes = (
  app: ForgeOpsFastifyInstance,
  options: RegisterRoutesOptions,
): void => {
  registerHealthRoutes(app, options.healthService);
  registerAuthReferenceRoutes(app);
  registerRepositoryRegistryRoutes(app, options.repositoryService);
  registerWorkflowCatalogRoutes(app, options.workflowService);
  registerWorkflowRunRoutes(app, options.workflowRunService);
  registerPullRequestRoutes(app, options.pullRequestService);
  registerPolicyEngineRoutes(app, options.policyCheckService);
  registerAutomationHealthRoutes(app, options.automationHealthService);
};
