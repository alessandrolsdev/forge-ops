import type { RouteGenericInterface } from 'fastify';
import { z } from 'zod';
import type { ForgeOpsFastifyInstance } from '../../app/register-routes.js';
import type { PullRequest } from './pull-request.entity.js';
import type { PullRequestService } from './pull-request.service.js';

const pullRequestParamsSchema = z.object({
  repositoryId: z.string().trim().min(1),
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

interface ListPullRequestsRoute extends RouteGenericInterface {
  Params: {
    repositoryId: string;
  };
  Reply: {
    pullRequests: PullRequestResponse[];
  };
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
};
