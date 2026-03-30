import type { RouteGenericInterface } from 'fastify';
import { z } from 'zod';
import type { ForgeOpsFastifyInstance } from '../../app/register-routes.js';
import type { Workflow } from './workflow.entity.js';
import type { WorkflowService } from './workflow.service.js';

const workflowParamsSchema = z.object({
  repositoryId: z.string().trim().min(1),
});

interface WorkflowResponse {
  id: string;
  repositoryId: string;
  githubWorkflowId: string;
  name: string;
  path: string;
  state:
    | 'active'
    | 'deleted'
    | 'disabled_fork'
    | 'disabled_inactivity'
    | 'disabled_manually';
  sourceType: 'local' | 'reusable';
  createdAt: string;
  updatedAt: string;
}

interface ListWorkflowCatalogRoute extends RouteGenericInterface {
  Params: {
    repositoryId: string;
  };
  Reply: {
    workflows: WorkflowResponse[];
  };
}

const toWorkflowResponse = (workflow: Workflow): WorkflowResponse => {
  return {
    id: workflow.id,
    repositoryId: workflow.repositoryId,
    githubWorkflowId: workflow.githubWorkflowId,
    name: workflow.name,
    path: workflow.path,
    state: workflow.state,
    sourceType: workflow.sourceType,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  };
};

export const registerWorkflowCatalogRoutes = (
  app: ForgeOpsFastifyInstance,
  workflowService: WorkflowService,
): void => {
  app.get<ListWorkflowCatalogRoute>(
    '/api/v1/repositories/:repositoryId/workflows',
    {
      config: {
        access: 'protected',
      },
    },
    async (request) => {
      const { repositoryId } = workflowParamsSchema.parse(request.params);
      const workflows = await workflowService.listByRepositoryId(repositoryId);

      return {
        workflows: workflows.map(toWorkflowResponse),
      };
    },
  );
};
