import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  FORGEOPS_WORKFLOW_PATH,
  FORGEOPS_WORKFLOW_TEMPLATE,
  VITEST_CONFIG_PATH,
  VITEST_CONFIG_TEMPLATE,
} from './templates.js';

export interface InitOptions {
  repositoryDir: string;
  openrouterKey?: string;
  openrouterModel?: string;
  geminiKey?: string;
  runCommand?: (command: string, args: string[]) => { status: number | null };
}

export interface InitResult {
  createdFiles: string[];
  skippedFiles: string[];
  configuredSecrets: string[];
  notes: string[];
}

const VITEST_CONFIG_CANDIDATES = [
  'vitest.config.ts',
  'vitest.config.mts',
  'vitest.config.js',
  'vitest.config.mjs',
  'vitest.workspace.ts',
];

const defaultRunCommand = (command: string, args: string[]) => {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  return { status: result.status };
};

const writeFileCreatingDirs = (filePath: string, content: string): void => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
};

export const runInit = (options: InitOptions): InitResult => {
  const runCommand = options.runCommand ?? defaultRunCommand;
  const result: InitResult = {
    createdFiles: [],
    skippedFiles: [],
    configuredSecrets: [],
    notes: [],
  };

  const workflowPath = join(options.repositoryDir, FORGEOPS_WORKFLOW_PATH);

  if (existsSync(workflowPath)) {
    result.skippedFiles.push(FORGEOPS_WORKFLOW_PATH);
  } else {
    writeFileCreatingDirs(workflowPath, FORGEOPS_WORKFLOW_TEMPLATE);
    result.createdFiles.push(FORGEOPS_WORKFLOW_PATH);
  }

  const hasPackageJson = existsSync(join(options.repositoryDir, 'package.json'));
  const hasVitestConfig = VITEST_CONFIG_CANDIDATES.some((candidate) =>
    existsSync(join(options.repositoryDir, candidate)),
  );

  if (hasPackageJson && !hasVitestConfig) {
    writeFileCreatingDirs(
      join(options.repositoryDir, VITEST_CONFIG_PATH),
      VITEST_CONFIG_TEMPLATE,
    );
    result.createdFiles.push(VITEST_CONFIG_PATH);
    result.notes.push(
      'Install the test tooling with: npm install --save-dev vitest @vitest/coverage-v8, and add "test": "vitest run --coverage" to your package.json scripts.',
    );
  } else if (hasPackageJson) {
    result.skippedFiles.push(VITEST_CONFIG_PATH);
  }

  const secretEntries: Array<{ kind: 'secret' | 'variable'; name: string; value: string }> = [];

  if (options.openrouterKey) {
    secretEntries.push({ kind: 'secret', name: 'OPENROUTER_API_KEY', value: options.openrouterKey });
  }

  if (options.openrouterModel) {
    secretEntries.push({ kind: 'variable', name: 'OPENROUTER_MODEL', value: options.openrouterModel });
  }

  if (options.geminiKey) {
    secretEntries.push({ kind: 'secret', name: 'GEMINI_API_KEY', value: options.geminiKey });
  }

  if (secretEntries.length > 0) {
    const ghAvailable = runCommand('gh', ['--version']).status === 0;

    if (!ghAvailable) {
      result.notes.push(
        'The gh CLI is not available; configure the review credentials manually in the repository settings (Settings > Secrets and variables > Actions).',
      );
    } else {
      for (const entry of secretEntries) {
        const args =
          entry.kind === 'secret'
            ? ['secret', 'set', entry.name, '--body', entry.value]
            : ['variable', 'set', entry.name, '--body', entry.value];
        const commandResult = runCommand('gh', args);

        if (commandResult.status === 0) {
          result.configuredSecrets.push(entry.name);
        } else {
          result.notes.push(
            `Failed to configure ${entry.name} via gh; set it manually in the repository settings.`,
          );
        }
      }
    }
  } else {
    result.notes.push(
      'No review credentials were provided; run again with --openrouter-key (and optionally --openrouter-model, --gemini-key) or configure the secrets manually to enable @forgeops review.',
    );
  }

  return result;
};
