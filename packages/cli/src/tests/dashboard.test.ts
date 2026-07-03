import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startDashboard } from '../dashboard.js';

let repositoryDir: string | null = null;

const createRepository = (): string => {
  repositoryDir = mkdtempSync(join(tmpdir(), 'forgeops-dashboard-'));
  return repositoryDir;
};

afterEach(() => {
  if (repositoryDir) {
    rmSync(repositoryDir, { recursive: true, force: true });
    repositoryDir = null;
  }

  delete process.env.GITHUB_REPOSITORY;
});

describe('startDashboard', () => {
  it('serves the dashboard page and the score API', async () => {
    const dir = createRepository();
    const workflowsDir = join(dir, '.github', 'workflows');
    mkdirSync(workflowsDir, { recursive: true });
    writeFileSync(join(workflowsDir, 'ci.yml'), 'name: CI\non: push\n');
    process.env.GITHUB_REPOSITORY = 'forgeops/sample';

    const server = await startDashboard(dir, 0);
    const address = server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Dashboard server did not expose a TCP address.');
    }

    try {
      const pageResponse = await fetch(`http://127.0.0.1:${address.port}/`);
      const pageBody = await pageResponse.text();

      expect(pageResponse.status).toBe(200);
      expect(pageBody).toContain('ForgeOps — Automation Health');

      const scoreResponse = await fetch(`http://127.0.0.1:${address.port}/api/score`);
      const payload = (await scoreResponse.json()) as {
        computation: { score: number; signals: Array<{ policyKey: string; status: string }> };
        workflowCount: number;
      };

      expect(scoreResponse.status).toBe(200);
      expect(payload.workflowCount).toBe(1);
      expect(
        payload.computation.signals.find(
          (signal) => signal.policyKey === 'ci_workflow_present',
        )?.status,
      ).toBe('compliant');
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });
});
