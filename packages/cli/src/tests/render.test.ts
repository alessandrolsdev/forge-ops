import { describe, expect, it } from 'vitest';
import { computeAutomationHealthScore } from '@forgeops/core';
import {
  HEALTH_COMMENT_MARKER,
  renderMarkdownReport,
  renderTerminalReport,
} from '../render.js';
import type { LocalHealthReport } from '../score.js';

const buildReport = (
  overrides: Partial<LocalHealthReport> = {},
): LocalHealthReport => {
  return {
    computation: computeAutomationHealthScore({
      workflows: [
        {
          name: 'Lint e Test',
          path: '.github/workflows/lint-test.yml',
          state: 'active',
          sourceType: 'local',
        },
      ],
      recentRunConclusions: ['success', 'failure'],
      reviewedPullRequests: [],
    }),
    workflowCount: 1,
    repositorySlug: { owner: 'forgeops', name: 'sample' },
    ciDataSource: 'github',
    ciDataNote: null,
    ...overrides,
  };
};

describe('renderTerminalReport', () => {
  it('renders the score, signal checklist, and reliability line', () => {
    const output = renderTerminalReport(buildReport());

    expect(output).toContain('forgeops/sample');
    expect(output).toContain('/100');
    expect(output).toContain('[x] ci workflow present');
    expect(output).toContain('[ ] security workflow present');
    expect(output).toContain('CI reliability: 13/25 (1 of 2 recent runs succeeded)');
  });

  it('explains when CI data is unavailable', () => {
    const output = renderTerminalReport(
      buildReport({
        ciDataSource: 'unavailable',
        ciDataNote: 'CI reliability unavailable: no token.',
      }),
    );

    expect(output).toContain('CI reliability: 0/25 — CI reliability unavailable: no token.');
  });
});

describe('renderMarkdownReport', () => {
  it('renders a marked markdown comment with the signal table', () => {
    const output = renderMarkdownReport(buildReport());

    expect(output.startsWith(HEALTH_COMMENT_MARKER)).toBe(true);
    expect(output).toContain('## ForgeOps automation health — forgeops/sample');
    expect(output).toContain('| ci workflow present | ✅ compliant |');
    expect(output).toContain('| security workflow present | ❌ non compliant |');
  });
});
