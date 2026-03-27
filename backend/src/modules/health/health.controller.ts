import { z } from 'zod';
import type { HealthService } from './health.service.js';

interface RouteRegistrar {
  get(path: string, ...args: readonly unknown[]): unknown;
}

const healthQuerySchema = z.object({
  verbose: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
});

export const registerHealthRoutes = (
  app: RouteRegistrar,
  healthService: HealthService,
): void => {
  app.get('/api/v1/health', async (request: { query: Record<string, unknown> }) => {
    healthQuerySchema.parse(request.query);
    return healthService.getSnapshot();
  });
};
