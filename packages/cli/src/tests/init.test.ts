import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInit } from '../init.js';
import { FORGEOPS_WORKFLOW_PATH, VITEST_CONFIG_PATH } from '../templates.js';

let repositoryDir: string | null = null;

const createRepository = (): string => {
  repositoryDir = mkdtempSync(join(tmpdir(), 'forgeops-init-'));
  return repositoryDir;
};

afterEach(() => {
  if (repositoryDir) {
    rmSync(repositoryDir, { recursive: true, force: true });
    repositoryDir = null;
  }
});

describe('runInit', () => {
  it('creates the forgeops workflow with the review trigger and health job', () => {
    const dir = createRepository();

    const result = runInit({ repositoryDir: dir });

    expect(result.createdFiles).toContain(FORGEOPS_WORKFLOW_PATH);

    const workflow = readFileSync(join(dir, FORGEOPS_WORKFLOW_PATH), 'utf8');

    expect(workflow).toContain("'@forgeops review'");
    expect(workflow).toContain('issue_comment');
    expect(workflow).toContain('forgeops-review@main');
    expect(workflow).toContain('score --github');
  });

  it('does not overwrite an existing forgeops workflow', () => {
    const dir = createRepository();

    runInit({ repositoryDir: dir });
    writeFileSync(join(dir, FORGEOPS_WORKFLOW_PATH), 'custom: true\n', 'utf8');

    const result = runInit({ repositoryDir: dir });

    expect(result.skippedFiles).toContain(FORGEOPS_WORKFLOW_PATH);
    expect(readFileSync(join(dir, FORGEOPS_WORKFLOW_PATH), 'utf8')).toBe('custom: true\n');
  });

  it('scaffolds a vitest config when a package.json exists without one', () => {
    const dir = createRepository();
    writeFileSync(join(dir, 'package.json'), '{"name":"sample"}', 'utf8');

    const result = runInit({ repositoryDir: dir });

    expect(result.createdFiles).toContain(VITEST_CONFIG_PATH);
    expect(existsSync(join(dir, VITEST_CONFIG_PATH))).toBe(true);
    expect(
      result.notes.some((note) => note.includes('vitest @vitest/coverage-v8')),
    ).toBe(true);
  });

  it('skips the vitest scaffold when a config already exists', () => {
    const dir = createRepository();
    writeFileSync(join(dir, 'package.json'), '{"name":"sample"}', 'utf8');
    writeFileSync(join(dir, 'vitest.config.mjs'), 'export default {};\n', 'utf8');

    const result = runInit({ repositoryDir: dir });

    expect(result.createdFiles).not.toContain(VITEST_CONFIG_PATH);
    expect(result.skippedFiles).toContain(VITEST_CONFIG_PATH);
  });

  it('configures review credentials through the gh CLI when available', () => {
    const dir = createRepository();
    const runCommand = vi.fn().mockReturnValue({ status: 0 });

    const result = runInit({
      repositoryDir: dir,
      openrouterKey: 'sk-or-test',
      openrouterModel: 'anthropic/claude-sonnet',
      runCommand,
    });

    expect(result.configuredSecrets).toEqual(['OPENROUTER_API_KEY', 'OPENROUTER_MODEL']);
    expect(runCommand).toHaveBeenCalledWith('gh', ['--version']);
    expect(runCommand).toHaveBeenCalledWith('gh', [
      'secret',
      'set',
      'OPENROUTER_API_KEY',
      '--body',
      'sk-or-test',
    ]);
    expect(runCommand).toHaveBeenCalledWith('gh', [
      'variable',
      'set',
      'OPENROUTER_MODEL',
      '--body',
      'anthropic/claude-sonnet',
    ]);
  });

  it('falls back to manual instructions when the gh CLI is missing', () => {
    const dir = createRepository();
    const runCommand = vi.fn().mockReturnValue({ status: 1 });

    const result = runInit({
      repositoryDir: dir,
      openrouterKey: 'sk-or-test',
      runCommand,
    });

    expect(result.configuredSecrets).toEqual([]);
    expect(result.notes.some((note) => note.includes('gh CLI is not available'))).toBe(true);
  });
});
