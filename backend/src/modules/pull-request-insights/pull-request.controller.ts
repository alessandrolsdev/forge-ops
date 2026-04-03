import type { RouteGenericInterface } from 'fastify';
import { z } from 'zod';
import type { ForgeOpsFastifyInstance } from '../../app/register-routes.js';
import type { PullRequest } from './pull-request.entity.js';
import type {
  PullRequestDetail,
  PullRequestService,
} from './pull-request.service.js';

const pullRequestParamsSchema = z.object({
  repositoryId: z.string().trim().min(1),
});

const pullRequestDetailParamsSchema = z.object({
  repositoryId: z.string().trim().min(1),
  pullRequestId: z.string().trim().min(1),
});

interface PullRequestResponse {
  id: string;
  githubPrId: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  baseBranch: string;
  headBranch: string;
  createdAt: string;
  updatedAt: string;
}

interface PullRequestDetailResponse {
  id: string;
  number: number;
  title: string;
  status: 'open' | 'closed' | 'merged';
  author: string;
  summary: {
    blockersCount: number;
    risksCount: number;
    suggestionsCount: number;
    lastReviewedAt: string;
  } | null;
  workflows: Array<{
    name: string;
    status:
      | 'queued'
      | 'in_progress'
      | 'completed'
      | 'pending'
      | 'waiting'
      | 'requested';
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
    startedAt: string | null;
    finishedAt: string | null;
  }>;
}

interface ListPullRequestsRoute extends RouteGenericInterface {
  Params: {
    repositoryId: string;
  };
  Reply: {
    pullRequests: PullRequestResponse[];
  };
}

interface GetPullRequestDetailRoute extends RouteGenericInterface {
  Params: {
    repositoryId: string;
    pullRequestId: string;
  };
  Reply: PullRequestDetailResponse;
}

const toPullRequestResponse = (pullRequest: PullRequest): PullRequestResponse => {
  return {
    id: pullRequest.id,
    githubPrId: pullRequest.githubPrId,
    number: pullRequest.number,
    title: pullRequest.title,
    state: pullRequest.state,
    author: pullRequest.author,
    baseBranch: pullRequest.baseBranch,
    headBranch: pullRequest.headBranch,
    createdAt: pullRequest.createdAt.toISOString(),
    updatedAt: pullRequest.updatedAt.toISOString(),
  };
};

const toPullRequestDetailResponse = (
  detail: PullRequestDetail,
): PullRequestDetailResponse => {
  return {
    id: detail.id,
    number: detail.number,
    title: detail.title,
    status: detail.status,
    author: detail.author,
    summary: detail.summary
      ? {
          blockersCount: detail.summary.blockersCount,
          risksCount: detail.summary.risksCount,
          suggestionsCount: detail.summary.suggestionsCount,
          lastReviewedAt: detail.summary.lastReviewedAt.toISOString(),
        }
      : null,
    workflows: detail.workflows.map((workflow) => ({
      name: workflow.name,
      status: workflow.status,
      conclusion: workflow.conclusion,
      startedAt: workflow.startedAt?.toISOString() ?? null,
      finishedAt: workflow.finishedAt?.toISOString() ?? null,
    })),
  };
};

export const registerPullRequestRoutes = (
  app: ForgeOpsFastifyInstance,
  pullRequestService: PullRequestService,
): void => {
  app.get<ListPullRequestsRoute>(
    '/api/v1/repositories/:repositoryId/pull-requests',
    {
      config: {
        access: 'protected',
      },
    },
    async (request) => {
      const { repositoryId } = pullRequestParamsSchema.parse(request.params);
      const pullRequests = await pullRequestService.listByRepositoryId(repositoryId);

      return {
        pullRequests: pullRequests.map(toPullRequestResponse),
      };
    },
  );

  app.get<GetPullRequestDetailRoute>(
    '/api/v1/repositories/:repositoryId/pull-requests/:pullRequestId',
    {
      config: {
        access: 'protected',
      },
    },
    async (request) => {
      const { repositoryId, pullRequestId } = pullRequestDetailParamsSchema.parse(
        request.params,
      );
      const detail = await pullRequestService.getDetailById(
        repositoryId,
        pullRequestId,
      );

      return toPullRequestDetailResponse(detail);
    },
  );
};
