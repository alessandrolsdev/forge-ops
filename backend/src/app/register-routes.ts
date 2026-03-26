import type { HealthService } from '../modules/health/health.service.js';
import { registerHealthRoutes } from '../modules/health/health.controller.js';

interface RegisterRoutesOptions {
  healthService: HealthService;
}

interface RouteRegistrar {
  get(path: string, ...args: readonly unknown[]): unknown;
}

export const registerRoutes = (
  app: RouteRegistrar,
  options: RegisterRoutesOptions,
): void => {
  registerHealthRoutes(app, options.healthService);
};
