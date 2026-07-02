import type { RouteGenericInterface } from 'fastify';
import { z } from 'zod';
import type { ForgeOpsFastifyInstance } from '../../app/register-routes.js';
import type { PolicyCheck } from './policy-check.entity.js';
import type { PolicyCheckService } from './policy-check.service.js';

const policyCheckParamsSchema = z.object({
  repositoryId: z.string().trim().min(1),
});

interface PolicyCheckResponse {
  id: string;
  repositoryId: string;
  policyKey:
    | 'ci_workflow_present'
    | 'lint_workflow_present'
    | 'test_workflow_present'
    | 'automated_review_present'
    | 'reusable_workflow_present'
    | 'security_workflow_present';
  status: 'compliant' | 'non_compliant';
  details: string;
  checkedAt: string;
}

interface ListPolicyChecksRoute extends RouteGenericInterface {
  Params: {
    repositoryId: string;
  };
  Reply: {
    policyChecks: PolicyCheckResponse[];
  };
}

interface EvaluatePolicyChecksRoute extends RouteGenericInterface {
  Params: {
    repositoryId: string;
  };
  Reply: {
    policyChecks: PolicyCheckResponse[];
  };
}

const toPolicyCheckResponse = (policyCheck: PolicyCheck): PolicyCheckResponse => {
  return {
    id: policyCheck.id,
    repositoryId: policyCheck.repositoryId,
    policyKey: policyCheck.policyKey,
    status: policyCheck.status,
    details: policyCheck.details,
    checkedAt: policyCheck.checkedAt.toISOString(),
  };
};

export const registerPolicyEngineRoutes = (
  app: ForgeOpsFastifyInstance,
  policyCheckService: PolicyCheckService,
): void => {
  app.get<ListPolicyChecksRoute>(
    '/api/v1/repositories/:repositoryId/policy-checks',
    {
      config: {
        access: 'protected',
      },
    },
    async (request) => {
      const { repositoryId } = policyCheckParamsSchema.parse(request.params);
      const policyChecks =
        await policyCheckService.listByRepositoryId(repositoryId);

      return {
        policyChecks: policyChecks.map(toPolicyCheckResponse),
      };
    },
  );

  app.post<EvaluatePolicyChecksRoute>(
    '/api/v1/repositories/:repositoryId/policy-checks/evaluate',
    {
      config: {
        access: 'protected',
        requiredCapability: 'repositories:write',
      },
    },
    async (request) => {
      const { repositoryId } = policyCheckParamsSchema.parse(request.params);
      const policyChecks =
        await policyCheckService.evaluateByRepositoryId(repositoryId);

      return {
        policyChecks: policyChecks.map(toPolicyCheckResponse),
      };
    },
  );
};
