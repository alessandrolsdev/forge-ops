import {
  computeAutomationHealthScore,
  scanLocalWorkflows,
  type AutomationHealthComputation,
} from '@forgeops/core';
import {
  fetchRecentRunConclusions,
  resolveGitHubToken,
  resolveRepositorySlug,
  type RepositorySlug,
} from './github.js';

export type CiDataSource = 'github' | 'unavailable';

export interface LocalHealthReport {
  computation: AutomationHealthComputation;
  workflowCount: number;
  repositorySlug: RepositorySlug | null;
  ciDataSource: CiDataSource;
  ciDataNote: string | null;
}

export interface ComputeLocalHealthOptions {
  repositoryDir: string;
  fetcher?: typeof fetch;
  token?: string | null;
}

export const computeLocalHealthReport = async (
  options: ComputeLocalHealthOptions,
): Promise<LocalHealthReport> => {
  const workflows = scanLocalWorkflows(options.repositoryDir);
  const repositorySlug = resolveRepositorySlug(options.repositoryDir);
  const token =
    options.token !== undefined ? options.token : resolveGitHubToken();

  let recentRunConclusions: Array<string | null> = [];
  let ciDataSource: CiDataSource = 'unavailable';
  let ciDataNote: string | null =
    'CI reliability unavailable: provide a GitHub token (GITHUB_TOKEN or gh auth login) to sample recent workflow runs.';

  if (repositorySlug && token) {
    try {
      recentRunConclusions = await fetchRecentRunConclusions(
        repositorySlug,
        token,
        options.fetcher ?? fetch,
      );
      ciDataSource = 'github';
      ciDataNote = null;
    } catch (error) {
      ciDataNote = `CI reliability unavailable: ${
        error instanceof Error ? error.message : 'GitHub API request failed.'
      }`;
    }
  } else if (!repositorySlug) {
    ciDataNote =
      'CI reliability unavailable: could not resolve the GitHub repository from the git remote.';
  }

  const computation = computeAutomationHealthScore({
    workflows,
    recentRunConclusions,
    reviewedPullRequests: [],
  });

  return {
    computation,
    workflowCount: workflows.length,
    repositorySlug,
    ciDataSource,
    ciDataNote,
  };
};
