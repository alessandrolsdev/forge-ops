import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli, type CliIo } from '../cli.js';
import { FORGEOPS_WORKFLOW_PATH } from '../templates.js';
import * as cliExports from '../index.js';
import { resolveGitHubToken, resolveRepositorySlug } from '../github.js';

let repositoryDir: string | null = null;

const createRepository = (): string => {
  repositoryDir = mkdtempSync(join(tmpdir(), 'forgeops-cli-cmd-'));
  return repositoryDir;
};

const createIo = () => {
  const logs: string[] = [];
  const errors: string[] = [];
  const io: CliIo = {
    log: (message) => logs.push(message),
    error: (message) => errors.push(message),
  };

  return { io, logs, errors };
};


const previousGitHubToken = process.env.GITHUB_TOKEN;

beforeEach(() => {
  delete process.env.GITHUB_TOKEN;
});

afterEach(() => {
  if (previousGitHubToken !== undefined) {
    process.env.GITHUB_TOKEN = previousGitHubToken;
  } else {
    delete process.env.GITHUB_TOKEN;
  }

  if (repositoryDir) {
    rmSync(repositoryDir, { recursive: true, force: true });
    repositoryDir = null;
  }

  delete process.env.GITHUB_REPOSITORY;
  delete process.env.GITHUB_STEP_SUMMARY;
  delete process.env.GH_TOKEN;
});

describe('runCli init', () => {
  it('scaffolds the workflow and reports the created files', async () => {
    const dir = createRepository();
    const { io, logs } = createIo();

    await expect(runCli(['init'], io, dir)).resolves.toBe(0);

    const output = logs.join('\n');

    expect(output).toContain(`created: ${FORGEOPS_WORKFLOW_PATH}`);
    expect(output).toContain('@forgeops review');
    expect(readFileSync(join(dir, FORGEOPS_WORKFLOW_PATH), 'utf8')).toContain(
      'forgeops-review@main',
    );
  });
});

describe('runCli score output modes', () => {
  it('emits markdown output with --markdown', async () => {
    const dir = createRepository();
    process.env.GITHUB_REPOSITORY = 'forgeops/sample';

    const { io, logs } = createIo();

    await expect(runCli(['score', '--markdown'], io, dir)).resolves.toBe(0);

    const output = logs.join('\n');

    expect(output).toContain('<!-- forgeops-health -->');
    expect(output).toContain('## ForgeOps automation health — forgeops/sample');
  });

  it('publishes the job summary with --github and reports the comment skip', async () => {
    const dir = createRepository();
    const summaryPath = join(dir, 'summary.md');
    writeFileSync(summaryPath, '', 'utf8');
    process.env.GITHUB_REPOSITORY = 'forgeops/sample';
    process.env.GITHUB_STEP_SUMMARY = summaryPath;

    const { io, errors } = createIo();

    await expect(runCli(['score', '--github'], io, dir)).resolves.toBe(0);

    expect(readFileSync(summaryPath, 'utf8')).toContain('ForgeOps automation health');
    expect(errors.join('\n')).toContain('Skipped the pull request comment');
  });
});

describe('github resolution helpers', () => {
  it('resolves the repository slug from GITHUB_REPOSITORY', () => {
    process.env.GITHUB_REPOSITORY = 'forgeops/sample';

    expect(resolveRepositorySlug(createRepository())).toEqual({
      owner: 'forgeops',
      name: 'sample',
    });
  });

  it('returns null when no remote or environment slug is available', () => {
    expect(resolveRepositorySlug(createRepository())).toBeNull();
  });

  it('resolves the token from the environment', () => {
    const previousGitHubToken = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    process.env.GH_TOKEN = 'env-token';

    try {
      expect(resolveGitHubToken()).toBe('env-token');
    } finally {
      if (previousGitHubToken !== undefined) {
        process.env.GITHUB_TOKEN = previousGitHubToken;
      }
    }
  });
});

describe('package entrypoint', () => {
  it('exposes the public API', () => {
    expect(typeof cliExports.runCli).toBe('function');
    expect(typeof cliExports.computeLocalHealthReport).toBe('function');
    expect(typeof cliExports.renderMarkdownReport).toBe('function');
    expect(typeof cliExports.runInit).toBe('function');
    expect(typeof cliExports.startDashboard).toBe('function');
  });
});
