import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli, type CliIo } from '../cli.js';

let repositoryDir: string | null = null;

const createRepository = (): string => {
  repositoryDir = mkdtempSync(join(tmpdir(), 'forgeops-cli-'));
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
});

describe('runCli', () => {
  it('prints the help text by default', async () => {
    const { io, logs } = createIo();

    await expect(runCli([], io, createRepository())).resolves.toBe(0);
    expect(logs.join('\n')).toContain('forgeops init');
    expect(logs.join('\n')).toContain('forgeops dashboard');
  });

  it('fails with a helpful message for unknown commands', async () => {
    const { io, errors } = createIo();

    await expect(runCli(['unknown'], io, createRepository())).resolves.toBe(1);
    expect(errors.join('\n')).toContain('Unknown command: unknown');
  });

  it('computes the local score for a repository with workflows', async () => {
    const dir = createRepository();
    const workflowsDir = join(dir, '.github', 'workflows');
    mkdirSync(workflowsDir, { recursive: true });
    writeFileSync(join(workflowsDir, 'lint-test.yml'), 'name: Lint e Test\non: push\n');
    process.env.GITHUB_REPOSITORY = 'forgeops/sample';

    const { io, logs } = createIo();

    await expect(runCli(['score'], io, dir)).resolves.toBe(0);

    const output = logs.join('\n');

    expect(output).toContain('forgeops/sample');
    expect(output).toContain('[x] ci workflow present');
    expect(output).toContain('[x] lint workflow present');
    expect(output).toContain('[x] test workflow present');
  });

  it('emits JSON output with --json', async () => {
    const dir = createRepository();
    process.env.GITHUB_REPOSITORY = 'forgeops/sample';

    const { io, logs } = createIo();

    await expect(runCli(['score', '--json'], io, dir)).resolves.toBe(0);

    const payload = JSON.parse(logs.join('\n')) as {
      computation: { score: number; grade: string };
    };

    expect(payload.computation.score).toBe(0);
    expect(payload.computation.grade).toBe('critical');
  });

  it('rejects invalid dashboard ports', async () => {
    const { io, errors } = createIo();

    await expect(
      runCli(['dashboard', '--port', 'abc'], io, createRepository()),
    ).resolves.toBe(1);
    expect(errors.join('\n')).toContain('Invalid port');
  });
});
