import { describe, expect, it } from 'vitest';
import {
  evaluatePolicySignals,
  type PolicySignalWorkflow,
} from '../../../modules/policy-engine/policy-signals.js';
import type {
  PolicyCheckStatus,
  PolicyKey,
} from '../../../modules/policy-engine/policy-check.entity.js';

const buildWorkflow = (
  overrides: Partial<PolicySignalWorkflow> = {},
): PolicySignalWorkflow => {
  return {
    name: 'CI',
    path: '.github/workflows/ci.yml',
    state: 'active',
    sourceType: 'local',
    ...overrides,
  };
};

const statusOf = (
  results: ReturnType<typeof evaluatePolicySignals>,
  policyKey: PolicyKey,
): PolicyCheckStatus => {
  const result = results.find((entry) => entry.policyKey === policyKey);

  if (!result) {
    throw new Error(`Missing policy signal result for ${policyKey}.`);
  }

  return result.status;
};

describe('evaluatePolicySignals', () => {
  it('returns all six policy keys exactly once', () => {
    const results = evaluatePolicySignals({
      workflows: [],
      reviewedPullRequestCount: 0,
    });

    expect(results.map((result) => result.policyKey)).toEqual([
      'ci_workflow_present',
      'lint_workflow_present',
      'test_workflow_present',
      'automated_review_present',
      'reusable_workflow_present',
      'security_workflow_present',
    ]);
  });

  it('marks everything non compliant for a repository without workflows or reviews', () => {
    const results = evaluatePolicySignals({
      workflows: [],
      reviewedPullRequestCount: 0,
    });

    for (const result of results) {
      expect(result.status).toBe('non_compliant');
      expect(result.details.length).toBeGreaterThan(0);
    }
  });

  it('marks everything compliant for a fully automated repository', () => {
    const results = evaluatePolicySignals({
      workflows: [
        buildWorkflow({ name: 'Lint', path: '.github/workflows/lint.yml' }),
        buildWorkflow({ name: 'Test', path: '.github/workflows/test.yml' }),
        buildWorkflow({
          name: 'Codex Review',
          path: '.github/workflows/codex-review.yml',
        }),
        buildWorkflow({
          name: 'Security Scan',
          path: '.github/workflows/security.yml',
        }),
        buildWorkflow({
          name: 'Reusable CI',
          path: '.github/workflows/reusable-ci.yml',
          sourceType: 'reusable',
        }),
      ],
      reviewedPullRequestCount: 3,
    });

    for (const result of results) {
      expect(result.status).toBe('compliant');
    }
  });

  it('ignores workflows that are not active', () => {
    const results = evaluatePolicySignals({
      workflows: [
        buildWorkflow({
          name: 'Lint',
          path: '.github/workflows/lint.yml',
          state: 'deleted',
        }),
        buildWorkflow({
          name: 'Test',
          path: '.github/workflows/test.yml',
          state: 'disabled_manually',
        }),
      ],
      reviewedPullRequestCount: 0,
    });

    expect(statusOf(results, 'ci_workflow_present')).toBe('non_compliant');
    expect(statusOf(results, 'lint_workflow_present')).toBe('non_compliant');
    expect(statusOf(results, 'test_workflow_present')).toBe('non_compliant');
  });

  it('matches keywords case-insensitively on the workflow name', () => {
    const results = evaluatePolicySignals({
      workflows: [buildWorkflow({ name: 'LINT AND FORMAT', path: 'x.yml' })],
      reviewedPullRequestCount: 0,
    });

    expect(statusOf(results, 'lint_workflow_present')).toBe('compliant');
  });

  it('matches keywords on the workflow path when the name does not match', () => {
    const results = evaluatePolicySignals({
      workflows: [
        buildWorkflow({ name: 'Qualidade', path: '.github/workflows/test.yml' }),
        buildWorkflow({ name: 'Analise', path: '.github/workflows/codeql.yml' }),
      ],
      reviewedPullRequestCount: 0,
    });

    expect(statusOf(results, 'test_workflow_present')).toBe('compliant');
    expect(statusOf(results, 'security_workflow_present')).toBe('compliant');
  });

  it('accepts reviewed pull requests as evidence of automated review', () => {
    const results = evaluatePolicySignals({
      workflows: [],
      reviewedPullRequestCount: 2,
    });

    expect(statusOf(results, 'automated_review_present')).toBe('compliant');
  });

  it('accepts a review workflow as evidence of automated review', () => {
    const results = evaluatePolicySignals({
      workflows: [
        buildWorkflow({
          name: 'Codex Review',
          path: '.github/workflows/codex-review.yml',
        }),
      ],
      reviewedPullRequestCount: 0,
    });

    expect(statusOf(results, 'automated_review_present')).toBe('compliant');
  });

  it('requires the reusable source type for the reusable workflow signal', () => {
    const results = evaluatePolicySignals({
      workflows: [
        buildWorkflow({
          name: 'Reusable CI',
          path: '.github/workflows/reusable.yml',
          sourceType: 'local',
        }),
      ],
      reviewedPullRequestCount: 0,
    });

    expect(statusOf(results, 'reusable_workflow_present')).toBe('non_compliant');
  });
});
