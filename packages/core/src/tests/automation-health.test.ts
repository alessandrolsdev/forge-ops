import { describe, expect, it } from 'vitest';
import {
  computeAutomationHealthScore,
  type AutomationHealthComputationInput,
} from '../automation-health.js';
import type { PolicySignalWorkflow } from '../policy-signals.js';

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

const fullyAutomatedWorkflows: PolicySignalWorkflow[] = [
  buildWorkflow({ name: 'Lint', path: '.github/workflows/lint.yml' }),
  buildWorkflow({ name: 'Test', path: '.github/workflows/test.yml' }),
  buildWorkflow({ name: 'Codex Review', path: '.github/workflows/codex-review.yml' }),
  buildWorkflow({ name: 'Security Scan', path: '.github/workflows/security.yml' }),
  buildWorkflow({
    name: 'Reusable CI',
    path: '.github/workflows/reusable-ci.yml',
    sourceType: 'reusable',
  }),
];

const compute = (overrides: Partial<AutomationHealthComputationInput> = {}) => {
  return computeAutomationHealthScore({
    workflows: [],
    recentRunConclusions: [],
    reviewedPullRequests: [],
    ...overrides,
  });
};

describe('computeAutomationHealthScore', () => {
  it('scores 100 healthy for a fully automated repository with reliable CI', () => {
    const result = compute({
      workflows: fullyAutomatedWorkflows,
      recentRunConclusions: Array.from({ length: 20 }, () => 'success'),
      reviewedPullRequests: [{ blockersCount: 0, isOpen: true }],
    });

    expect(result.score).toBe(100);
    expect(result.grade).toBe('healthy');
    expect(result.ciReliability).toEqual({
      weight: 25,
      earnedPoints: 25,
      consideredRunCount: 20,
      successfulRunCount: 20,
    });
    expect(result.blockersPenalty).toEqual({
      openBlockersCount: 0,
      penaltyPoints: 0,
    });
  });

  it('scores 0 critical for a repository without any automation', () => {
    const result = compute();

    expect(result.score).toBe(0);
    expect(result.grade).toBe('critical');
    expect(result.signals).toHaveLength(6);
    expect(result.ciReliability.consideredRunCount).toBe(0);
  });

  it('rounds ci reliability from the success ratio', () => {
    const result = compute({
      workflows: [buildWorkflow()],
      recentRunConclusions: [
        ...Array.from({ length: 15 }, () => 'success'),
        ...Array.from({ length: 5 }, () => 'failure'),
      ],
    });

    // 25 * 15/20 = 18.75 -> 19
    expect(result.ciReliability.earnedPoints).toBe(19);
  });

  it('excludes skipped, neutral, and null conclusions from the reliability sample', () => {
    const result = compute({
      workflows: [buildWorkflow()],
      recentRunConclusions: ['success', 'skipped', 'neutral', null, 'failure'],
    });

    expect(result.ciReliability.consideredRunCount).toBe(2);
    expect(result.ciReliability.successfulRunCount).toBe(1);
    expect(result.ciReliability.earnedPoints).toBe(13);
  });

  it('penalizes blockers only on open pull requests and caps the penalty at 15', () => {
    const result = compute({
      workflows: fullyAutomatedWorkflows,
      recentRunConclusions: ['success'],
      reviewedPullRequests: [
        { blockersCount: 4, isOpen: true },
        { blockersCount: 9, isOpen: false },
      ],
    });

    expect(result.blockersPenalty).toEqual({
      openBlockersCount: 4,
      penaltyPoints: 12,
    });

    const capped = compute({
      workflows: fullyAutomatedWorkflows,
      recentRunConclusions: ['success'],
      reviewedPullRequests: [{ blockersCount: 10, isOpen: true }],
    });

    expect(capped.blockersPenalty).toEqual({
      openBlockersCount: 10,
      penaltyPoints: 15,
    });
  });

  it('clamps the final score at zero', () => {
    const result = compute({
      reviewedPullRequests: [{ blockersCount: 10, isOpen: true }],
    });

    // automated_review_present (15) - penalidade (15) = 0
    expect(result.score).toBe(0);
    expect(result.grade).toBe('critical');
  });

  it('maps grade boundaries at 80 and 50 points', () => {
    const healthy = compute({
      workflows: fullyAutomatedWorkflows,
      recentRunConclusions: ['success', 'failure', 'failure', 'failure', 'failure'],
      reviewedPullRequests: [{ blockersCount: 0, isOpen: true }],
    });

    // 75 + round(25/5) = 80
    expect(healthy.score).toBe(80);
    expect(healthy.grade).toBe('healthy');

    const attention = compute({
      workflows: fullyAutomatedWorkflows,
      recentRunConclusions: ['success', 'failure', 'failure', 'failure', 'failure'],
      reviewedPullRequests: [{ blockersCount: 1, isOpen: true }],
    });

    expect(attention.score).toBe(77);
    expect(attention.grade).toBe('attention');

    const critical = compute({
      workflows: [buildWorkflow({ name: 'Pipeline', path: 'p.yml' })],
    });

    expect(critical.score).toBe(15);
    expect(critical.grade).toBe('critical');
  });
});
