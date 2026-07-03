import { spawnSync } from 'node:child_process';
import { RECENT_RUN_SAMPLE_SIZE } from '@forgeops/core';

export interface RepositorySlug {
  owner: string;
  name: string;
}

export const parseRepositorySlug = (remoteUrl: string): RepositorySlug | null => {
  const match =
    /github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(remoteUrl.trim());

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return { owner: match[1], name: match[2] };
};

export const resolveRepositorySlug = (
  repositoryDir: string,
): RepositorySlug | null => {
  if (process.env.GITHUB_REPOSITORY) {
    const [owner, name] = process.env.GITHUB_REPOSITORY.split('/');

    if (owner && name) {
      return { owner, name };
    }
  }

  const result = spawnSync('git', ['-C', repositoryDir, 'remote', 'get-url', 'origin'], {
    encoding: 'utf8',
  });

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  return parseRepositorySlug(result.stdout);
};

export const resolveGitHubToken = (): string | null => {
  const envToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

  if (envToken && envToken.trim().length > 0) {
    return envToken.trim();
  }

  const result = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8' });

  if (result.status === 0 && result.stdout.trim().length > 0) {
    return result.stdout.trim();
  }

  return null;
};

interface WorkflowRunsPayload {
  workflow_runs?: Array<{ conclusion?: string | null }>;
}

export const fetchRecentRunConclusions = async (
  slug: RepositorySlug,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<Array<string | null>> => {
  const url = `https://api.github.com/repos/${slug.owner}/${slug.name}/actions/runs?status=completed&per_page=${RECENT_RUN_SAMPLE_SIZE}`;
  const response = await fetcher(url, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API request for workflow runs failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as WorkflowRunsPayload;

  return (payload.workflow_runs ?? []).map((run) => run.conclusion ?? null);
};
