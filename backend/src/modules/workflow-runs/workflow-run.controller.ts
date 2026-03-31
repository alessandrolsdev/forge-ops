import type { RouteGenericInterface } from 'fastify';
import { z } from 'zod';
import type { ForgeOpsFastifyInstance } from '../../app/register-routes.js';
import type { WorkflowRunService } from './workflow-run.service.js';
import type { WorkflowRun } from './workflow-run.entity.js';

const workflowRunParamsSchema = z.object({
  repositoryId: z.string().trim().min(1),
  workflowId: z.string().trim().min(1),
});

interface WorkflowRunResponse {
  id: string;
  workflowId: string;
  githubRunId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'pending' | 'waiting' | 'requested';
  conclusion:
    | 'success'
    | 'failure'
    | 'neutral'
    | 'cancelled'
    | 'skipped'
    | 'timed_out'
    | 'action_required'
    | 'stale'
    | 'startup_failure'
    | null;
  branch: string;
  sha: string;
  event: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ListWorkflowRunsRoute extends RouteGenericInterface {
  Params: {
    repositoryId: string;
    workflowId: string;
  };
  Reply: {
    runs: WorkflowRunResponse[];
  };
}

const toWorkflowRunResponse = (workflowRun: WorkflowRun): WorkflowRunResponse => {
  return {
    id: workflowRun.id,
    workflowId: workflowRun.workflowId,
    githubRunId: workflowRun.githubRunId,
    status: workflowRun.status,
    conclusion: workflowRun.conclusion,
    branch: workflowRun.branch,
    sha: workflowRun.sha,
    event: workflowRun.event,
    startedAt: workflowRun.startedAt?.toISOString() ?? null,
    finishedAt: workflowRun.finishedAt?.toISOString() ?? null,
    durationMs: workflowRun.durationMs,
    createdAt: workflowRun.createdAt.toISOString(),
    updatedAt: workflowRun.updatedAt.toISOString(),
  };
};

export const registerWorkflowRunRoutes = (
  app: ForgeOpsFastifyInstance,
  workflowRunService: WorkflowRunService,
): void => {
  app.get<ListWorkflowRunsRoute>(
    '/api/v1/repositories/:repositoryId/workflows/:workflowId/runs',
    {
      config: {
        access: 'protected',
      },
    },
    async (request) => {
      const { repositoryId, workflowId } = workflowRunParamsSchema.parse(request.params);
      const runs = await workflowRunService.listByWorkflowId(repositoryId, workflowId);

      return {
        runs: runs.map(toWorkflowRunResponse),
      };
    },
  );
};
