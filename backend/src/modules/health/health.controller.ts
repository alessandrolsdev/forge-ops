import type { FastifyRequest, RouteGenericInterface } from 'fastify';
import { z } from 'zod';
import type { ForgeOpsFastifyInstance } from '../../app/register-routes.js';
import type { HealthService, HealthSnapshot } from './health.service.js';

interface HealthRouteGeneric extends RouteGenericInterface {
  Querystring: {
    verbose?: 'true' | 'false';
  };
  Reply: HealthSnapshot;
}

export type HealthRouteService = Pick<HealthService, 'getSnapshot'>;

const healthQuerySchema = z.object({
  verbose: z.union([z.literal('true'), z.literal('false')]).optional(),
});

type HealthRouteRequest = FastifyRequest<HealthRouteGeneric>;

export const registerHealthRoutes = (
  app: ForgeOpsFastifyInstance,
  healthService: HealthRouteService,
): void => {
  app.get<HealthRouteGeneric>('/api/v1/health', async (request: HealthRouteRequest) => {
    healthQuerySchema.parse(request.query);
    return healthService.getSnapshot();
  });
};
