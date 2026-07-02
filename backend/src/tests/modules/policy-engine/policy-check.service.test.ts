import { describe, expect, it, vi } from 'vitest';
import { RepositoryNotFoundError } from '../../../modules/repository-registry/repository.errors.js';
import { PolicyCheckService } from '../../../modules/policy-engine/policy-check.service.js';
import type {
  PolicyCheck,
  UpsertPolicyCheckInput,
} from '../../../modules/policy-engine/policy-check.entity.js';
import type { Repository } from '../../../modules/repository-registry/repository.entity.js';
import type { Workflow } from '../../../modules/workflow-catalog/workflow.entity.js';
import type { CodexReviewSummary } from '../../../modules/pull-request-insights/codex-review-summary.entity.js';

const buildRepository = (overrides: Partial<Repository> = {}): Repository => {
  const createdAt = new Date('2026-03-27T16:45:00.000Z');

  return {
    id: 'repo_123',
    githubRepoId: '123456789',
    owner: 'forgeops',
    name: 'backend',
    fullName: 'forgeops/backend',
    defaultBranch: 'main',
    isActive: true,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const buildWorkflow = (overrides: Partial<Workflow> = {}): Workflow => {
  const createdAt = new Date('2026-03-30T15:10:00.000Z');

  return {
    id: 'workflow_123',
    repositoryId: 'repo_123',
    githubWorkflowId: 'workflow-gh-123',
    name: 'CI',
    path: '.github/workflows/ci.yml',
    state: 'active',
    sourceType: 'local',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const buildSummary = (
  overrides: Partial<CodexReviewSummary> = {},
): CodexReviewSummary => {
  const createdAt = new Date('2026-03-31T18:50:00.000Z');

  return {
    id: 'summary_123',
    pullRequestId: 'pr_123',
    source: 'github_review',
    summary: 'Codex sinalizou 1 achado.',
    blockersCount: 1,
    suggestionsCount: 0,
    risksCount: 1,
    rawContent: '[P1] Corrigir validacao',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
};

const toPolicyCheck = (input: UpsertPolicyCheckInput): PolicyCheck => {
  return {
    id: `policy_${input.policyKey}`,
    repositoryId: input.repositoryId,
    policyKey: input.policyKey,
    status: input.status,
    details: input.details,
    checkedAt: input.checkedAt,
    createdAt: input.checkedAt,
    updatedAt: input.checkedAt,
  };
};

describe('PolicyCheckService', () => {
  it('evaluates and upserts one policy check per signal', async () => {
    const upsert = vi
      .fn()
      .mockImplementation(async (input: UpsertPolicyCheckInput) =>
        toPolicyCheck(input),
      );
    const service = new PolicyCheckService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi
          .fn()
          .mockResolvedValue([
            buildWorkflow({ name: 'Lint', path: '.github/workflows/lint.yml' }),
            buildWorkflow({ name: 'Test', path: '.github/workflows/test.yml' }),
          ]),
        findById: vi.fn(),
      },
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn(),
        listByRepositoryId: vi.fn().mockResolvedValue([buildSummary()]),
      },
      policyCheckRepository: {
        upsert,
        listByRepositoryId: vi.fn(),
      },
    });

    const policyChecks = await service.evaluateByRepositoryId('repo_123');

    expect(policyChecks).toHaveLength(6);
    expect(upsert).toHaveBeenCalledTimes(6);

    const checkedAtValues = new Set(
      upsert.mock.calls.map(
        ([input]) => (input as UpsertPolicyCheckInput).checkedAt.getTime(),
      ),
    );

    expect(checkedAtValues.size).toBe(1);

    const byKey = new Map(
      policyChecks.map((check) => [check.policyKey, check.status]),
    );

    expect(byKey.get('ci_workflow_present')).toBe('compliant');
    expect(byKey.get('lint_workflow_present')).toBe('compliant');
    expect(byKey.get('test_workflow_present')).toBe('compliant');
    expect(byKey.get('automated_review_present')).toBe('compliant');
    expect(byKey.get('reusable_workflow_present')).toBe('non_compliant');
    expect(byKey.get('security_workflow_present')).toBe('non_compliant');
  });

  it('throws RepositoryNotFoundError when evaluating an unknown repository', async () => {
    const upsert = vi.fn();
    const service = new PolicyCheckService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn(),
      },
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn(),
        listByRepositoryId: vi.fn(),
      },
      policyCheckRepository: {
        upsert,
        listByRepositoryId: vi.fn(),
      },
    });

    await expect(
      service.evaluateByRepositoryId('repo_missing'),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('propagates persistence failures and logs the evaluation error', async () => {
    const error = vi.fn();
    const service = new PolicyCheckService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn().mockResolvedValue([]),
        findById: vi.fn(),
      },
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn(),
        listByRepositoryId: vi.fn().mockResolvedValue([]),
      },
      policyCheckRepository: {
        upsert: vi.fn().mockRejectedValue(new Error('database unavailable')),
        listByRepositoryId: vi.fn(),
      },
      logger: {
        info: vi.fn(),
        error,
      },
    });

    await expect(service.evaluateByRepositoryId('repo_123')).rejects.toThrow(
      'database unavailable',
    );
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'policy_evaluation_failed' }),
      expect.any(String),
    );
  });

  it('lists persisted policy checks for an existing repository', async () => {
    const persisted = toPolicyCheck({
      repositoryId: 'repo_123',
      policyKey: 'ci_workflow_present',
      status: 'compliant',
      details: 'Found 1 active workflow(s).',
      checkedAt: new Date('2026-04-01T10:00:00.000Z'),
    });
    const service = new PolicyCheckService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn(),
      },
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn(),
        listByRepositoryId: vi.fn(),
      },
      policyCheckRepository: {
        upsert: vi.fn(),
        listByRepositoryId: vi.fn().mockResolvedValue([persisted]),
      },
    });

    await expect(service.listByRepositoryId('repo_123')).resolves.toEqual([
      persisted,
    ]);
  });

  it('returns an empty list when the repository was never evaluated', async () => {
    const service = new PolicyCheckService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(buildRepository()),
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn(),
      },
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn(),
        listByRepositoryId: vi.fn(),
      },
      policyCheckRepository: {
        upsert: vi.fn(),
        listByRepositoryId: vi.fn().mockResolvedValue([]),
      },
    });

    await expect(service.listByRepositoryId('repo_123')).resolves.toEqual([]);
  });

  it('throws RepositoryNotFoundError when listing an unknown repository', async () => {
    const service = new PolicyCheckService({
      repositoryRegistryRepository: {
        create: vi.fn(),
        list: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        deleteById: vi.fn(),
      },
      workflowRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
        findById: vi.fn(),
      },
      codexReviewSummaryRepository: {
        create: vi.fn(),
        upsert: vi.fn(),
        findByPullRequestId: vi.fn(),
        listByRepositoryId: vi.fn(),
      },
      policyCheckRepository: {
        upsert: vi.fn(),
        listByRepositoryId: vi.fn(),
      },
    });

    await expect(
      service.listByRepositoryId('repo_missing'),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });
});
