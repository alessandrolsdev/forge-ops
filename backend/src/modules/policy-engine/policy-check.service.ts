import type { Logger } from 'pino';
import { ApplicationError } from '../../shared/errors/application-error.js';
import { RepositoryNotFoundError } from '../repository-registry/repository.errors.js';
import type { RepositoryRepository } from '../repository-registry/repository.repository.js';
import type { WorkflowRepository } from '../workflow-catalog/workflow.repository.js';
import type { CodexReviewSummaryRepository } from '../pull-request-insights/codex-review-summary.repository.js';
import type { PolicyCheck } from './policy-check.entity.js';
import type { PolicyCheckRepository } from './policy-check.repository.js';
import { evaluatePolicySignals } from './policy-signals.js';

type ServiceLogger = Pick<Logger, 'info' | 'error'>;

const noopLogger: ServiceLogger = {
  info: () => undefined,
  error: () => undefined,
};

export interface PolicyCheckServiceOptions {
  repositoryRegistryRepository: RepositoryRepository;
  workflowRepository: WorkflowRepository;
  codexReviewSummaryRepository: CodexReviewSummaryRepository;
  policyCheckRepository: PolicyCheckRepository;
  logger?: ServiceLogger;
}

export class PolicyCheckService {
  constructor(private readonly options: PolicyCheckServiceOptions) {}

  async evaluateByRepositoryId(repositoryId: string): Promise<PolicyCheck[]> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      const error = new RepositoryNotFoundError();

      this.logger.error(
        {
          event: 'policy_evaluation_failed',
          repositoryId,
          errorCode: error.code,
          errorStatusCode: error.statusCode,
        },
        'Policy evaluation failed.',
      );

      throw error;
    }

    try {
      const [workflows, reviewSummaries] = await Promise.all([
        this.options.workflowRepository.listByRepositoryId(repositoryId),
        this.options.codexReviewSummaryRepository.listByRepositoryId(
          repositoryId,
        ),
      ]);

      const signals = evaluatePolicySignals({
        workflows,
        reviewedPullRequestCount: reviewSummaries.length,
      });
      const checkedAt = new Date();
      const policyChecks: PolicyCheck[] = [];

      for (const signal of signals) {
        policyChecks.push(
          await this.options.policyCheckRepository.upsert({
            repositoryId: repository.id,
            policyKey: signal.policyKey,
            status: signal.status,
            details: signal.details,
            checkedAt,
          }),
        );
      }

      this.logger.info(
        {
          event: 'policy_evaluation_succeeded',
          repositoryId: repository.id,
          fullName: repository.fullName,
          policyCheckCount: policyChecks.length,
          compliantCount: policyChecks.filter(
            (check) => check.status === 'compliant',
          ).length,
        },
        'Policy evaluation completed.',
      );

      return policyChecks;
    } catch (error) {
      this.logger.error(
        {
          event: 'policy_evaluation_failed',
          repositoryId: repository.id,
          fullName: repository.fullName,
          ...serializeApplicationError(error),
        },
        'Policy evaluation failed.',
      );

      throw error;
    }
  }

  async listByRepositoryId(repositoryId: string): Promise<PolicyCheck[]> {
    const repository =
      await this.options.repositoryRegistryRepository.findById(repositoryId);

    if (!repository) {
      throw new RepositoryNotFoundError();
    }

    return this.options.policyCheckRepository.listByRepositoryId(repositoryId);
  }

  private get logger(): ServiceLogger {
    return this.options.logger ?? noopLogger;
  }
}

const serializeApplicationError = (
  error: unknown,
): Record<string, string | number> => {
  if (error instanceof ApplicationError) {
    return {
      errorCode: error.code,
      errorStatusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      errorName: error.name,
    };
  }

  return {
    errorName: 'UnknownError',
  };
};
