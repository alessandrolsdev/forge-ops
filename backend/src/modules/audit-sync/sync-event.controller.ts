import type { RouteGenericInterface } from 'fastify';
import { z } from 'zod';
import type { ForgeOpsFastifyInstance } from '../../app/register-routes.js';
import type { SyncEvent } from './sync-event.entity.js';
import type { SyncEventService } from './sync-event.service.js';

const syncEventParamsSchema = z.object({
  repositoryId: z.string().trim().min(1),
});

interface SyncEventResponse {
  id: string;
  repositoryId: string;
  type:
    | 'repository_connected'
    | 'workflow_catalog_sync'
    | 'workflow_runs_sync'
    | 'pull_requests_sync'
    | 'codex_review_sync'
    | 'policy_evaluation';
  status: 'succeeded' | 'failed';
  details: string;
  createdAt: string;
}

interface ListSyncEventsRoute extends RouteGenericInterface {
  Params: {
    repositoryId: string;
  };
  Reply: {
    syncEvents: SyncEventResponse[];
  };
}

const toSyncEventResponse = (syncEvent: SyncEvent): SyncEventResponse => {
  return {
    id: syncEvent.id,
    repositoryId: syncEvent.repositoryId,
    type: syncEvent.type,
    status: syncEvent.status,
    details: syncEvent.details,
    createdAt: syncEvent.createdAt.toISOString(),
  };
};

export const registerAuditSyncRoutes = (
  app: ForgeOpsFastifyInstance,
  syncEventService: SyncEventService,
): void => {
  app.get<ListSyncEventsRoute>(
    '/api/v1/repositories/:repositoryId/sync-events',
    {
      config: {
        access: 'protected',
      },
    },
    async (request) => {
      const { repositoryId } = syncEventParamsSchema.parse(request.params);
      const syncEvents =
        await syncEventService.listByRepositoryId(repositoryId);

      return {
        syncEvents: syncEvents.map(toSyncEventResponse),
      };
    },
  );
};
