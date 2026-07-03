import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { PolicySignalWorkflow } from './policy-signals.js';

const WORKFLOW_FILE_PATTERN = /\.ya?ml$/i;

const extractWorkflowName = (content: string, fallback: string): string => {
  for (const line of content.split(/\r?\n/)) {
    const match = /^name:\s*(.+)\s*$/.exec(line);

    if (match?.[1]) {
      return match[1].replace(/^['"]|['"]$/g, '').trim() || fallback;
    }
  }

  return fallback;
};

const isReusableWorkflow = (content: string): boolean => {
  return /^\s{2,}workflow_call\s*:/m.test(content);
};

export const scanLocalWorkflows = (
  repositoryDir: string,
): PolicySignalWorkflow[] => {
  const workflowsDir = join(repositoryDir, '.github', 'workflows');
  let entries: string[];

  try {
    if (!statSync(workflowsDir).isDirectory()) {
      return [];
    }

    entries = readdirSync(workflowsDir);
  } catch {
    return [];
  }

  return entries
    .filter((entry) => WORKFLOW_FILE_PATTERN.test(entry))
    .sort()
    .map((entry) => {
      const filePath = join(workflowsDir, entry);
      let content = '';

      try {
        content = readFileSync(filePath, 'utf8');
      } catch {
        content = '';
      }

      return {
        name: extractWorkflowName(content, entry),
        path: `.github/workflows/${entry}`,
        state: 'active' as const,
        sourceType: isReusableWorkflow(content)
          ? ('reusable' as const)
          : ('local' as const),
      };
    });
};
