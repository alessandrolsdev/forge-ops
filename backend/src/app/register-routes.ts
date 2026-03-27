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

interface RegisterRoutesOptions {
  healthService: HealthService;
  repositoryService: RepositoryService;
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
};
