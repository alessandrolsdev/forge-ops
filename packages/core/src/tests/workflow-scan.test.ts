import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanLocalWorkflows } from '../workflow-scan.js';

let repositoryDir: string | null = null;

const createRepository = (): string => {
  repositoryDir = mkdtempSync(join(tmpdir(), 'forgeops-scan-'));
  return repositoryDir;
};

const writeWorkflow = (dir: string, fileName: string, content: string): void => {
  const workflowsDir = join(dir, '.github', 'workflows');
  mkdirSync(workflowsDir, { recursive: true });
  writeFileSync(join(workflowsDir, fileName), content, 'utf8');
};

afterEach(() => {
  if (repositoryDir) {
    rmSync(repositoryDir, { recursive: true, force: true });
    repositoryDir = null;
  }
});

describe('scanLocalWorkflows', () => {
  it('returns an empty list when the workflows directory does not exist', () => {
    const dir = createRepository();

    expect(scanLocalWorkflows(dir)).toEqual([]);
  });

  it('extracts the workflow name, path, and source type from files', () => {
    const dir = createRepository();

    writeWorkflow(dir, 'ci.yml', 'name: CI\non:\n  push:\n');
    writeWorkflow(
      dir,
      'reusable-test.yaml',
      "name: 'Reusable Test'\non:\n  workflow_call:\n    inputs: {}\n",
    );
    writeWorkflow(dir, 'notes.txt', 'name: not a workflow');

    expect(scanLocalWorkflows(dir)).toEqual([
      {
        name: 'CI',
        path: '.github/workflows/ci.yml',
        state: 'active',
        sourceType: 'local',
      },
      {
        name: 'Reusable Test',
        path: '.github/workflows/reusable-test.yaml',
        state: 'active',
        sourceType: 'reusable',
      },
    ]);
  });

  it('falls back to the file name when the workflow has no name', () => {
    const dir = createRepository();

    writeWorkflow(dir, 'unnamed.yml', 'on:\n  push:\n');

    expect(scanLocalWorkflows(dir)).toEqual([
      {
        name: 'unnamed.yml',
        path: '.github/workflows/unnamed.yml',
        state: 'active',
        sourceType: 'local',
      },
    ]);
  });
});
