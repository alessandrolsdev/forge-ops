import type { RouteGenericInterface } from 'fastify';
import { z } from 'zod';
import type { ForgeOpsFastifyInstance } from '../../app/register-routes.js';
import type { AutomationHealthScore } from './automation-health.entity.js';
import type { AutomationHealthService } from './automation-health.service.js';

const automationHealthParamsSchema = z.object({
  repositoryId: z.string().trim().min(1),
});

interface AutomationHealthScoreResponse {
  repositoryId: string;
  fullName: string;
  score: number;
  grade: 'healthy' | 'attention' | 'critical';
  signals: Array<{
    policyKey:
      | 'ci_workflow_present'
      | 'lint_workflow_present'
      | 'test_workflow_present'
      | 'automated_review_present'
      | 'reusable_workflow_present'
      | 'security_workflow_present';
    status: 'compliant' | 'non_compliant';
    weight: number;
    earnedPoints: number;
    details: string;
  }>;
  ciReliability: {
    weight: number;
    earnedPoints: number;
    consideredRunCount: number;
    successfulRunCount: number;
  };
  blockersPenalty: {
    openBlockersCount: number;
    penaltyPoints: number;
  };
  computedAt: string;
}

interface GetAutomationHealthOverviewRoute extends RouteGenericInterface {
  Reply: {
    repositories: AutomationHealthScoreResponse[];
  };
}

interface GetRepositoryAutomationHealthRoute extends RouteGenericInterface {
  Params: {
    repositoryId: string;
  };
  Reply: {
    health: AutomationHealthScoreResponse;
  };
}

const toAutomationHealthScoreResponse = (
  healthScore: AutomationHealthScore,
): AutomationHealthScoreResponse => {
  return {
    repositoryId: healthScore.repositoryId,
    fullName: healthScore.fullName,
    score: healthScore.score,
    grade: healthScore.grade,
    signals: healthScore.signals.map((signal) => ({
      policyKey: signal.policyKey,
      status: signal.status,
      weight: signal.weight,
      earnedPoints: signal.earnedPoints,
      details: signal.details,
    })),
    ciReliability: {
      weight: healthScore.ciReliability.weight,
      earnedPoints: healthScore.ciReliability.earnedPoints,
      consideredRunCount: healthScore.ciReliability.consideredRunCount,
      successfulRunCount: healthScore.ciReliability.successfulRunCount,
    },
    blockersPenalty: {
      openBlockersCount: healthScore.blockersPenalty.openBlockersCount,
      penaltyPoints: healthScore.blockersPenalty.penaltyPoints,
    },
    computedAt: healthScore.computedAt.toISOString(),
  };
};

export const registerAutomationHealthRoutes = (
  app: ForgeOpsFastifyInstance,
  automationHealthService: AutomationHealthService,
): void => {
  app.get<GetAutomationHealthOverviewRoute>(
    '/api/v1/automation-health',
    {
      config: {
        access: 'protected',
      },
    },
    async () => {
      const scores = await automationHealthService.getOverview();

      return {
        repositories: scores.map(toAutomationHealthScoreResponse),
      };
    },
  );

  app.get<GetRepositoryAutomationHealthRoute>(
    '/api/v1/repositories/:repositoryId/automation-health',
    {
      config: {
        access: 'protected',
      },
    },
    async (request) => {
      const { repositoryId } = automationHealthParamsSchema.parse(
        request.params,
      );
      const healthScore =
        await automationHealthService.getScoreByRepositoryId(repositoryId);

      return {
        health: toAutomationHealthScoreResponse(healthScore),
      };
    },
  );
};
