import type { GitHubAppEnv } from '../../infra/config/github-app-env.js';
import {
  GitHubAppProvider,
  type GitHubAppProviderOptions,
} from './providers/github-app.provider.js';
import type { PullRequestState } from '../pull-request-insights/pull-request.entity.js';
import type {
  WorkflowExecutionConclusion,
  WorkflowExecutionStatus,
} from '../workflow-runs/workflow-run.entity.js';

export interface GitHubRepositoryDescriptor {
  owner: string;
  name: string;
}

export interface GitHubInstallationRepository {
  githubRepoId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
}

export interface GitHubWorkflowDescriptor {
  githubWorkflowId: string;
  name: string;
  path: string;
  state:
    | 'active'
    | 'deleted'
    | 'disabled_fork'
    | 'disabled_inactivity'
    | 'disabled_manually';
  sourceType: 'local' | 'reusable';
}

export interface GitHubWorkflowRunDescriptor {
  githubRunId: string;
  status: WorkflowExecutionStatus;
  conclusion: WorkflowExecutionConclusion | null;
  branch: string;
  sha: string;
  event: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number | null;
}

export interface GitHubWorkflowJobDescriptor {
  githubJobId: string;
  name: string;
  status: WorkflowExecutionStatus;
  conclusion: WorkflowExecutionConclusion | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface GitHubPullRequestDescriptor {
  githubPrId: string;
  number: number;
  title: string;
  state: PullRequestState;
  author: string;
  baseBranch: string;
  headBranch: string;
}

export interface GitHubPullRequestReviewCommentDescriptor {
  githubReviewCommentId: string;
  reviewerLogin: string;
  body: string;
  path: string | null;
  createdAt: Date | null;
}

export interface GitHubAppBoundary {
  readonly mode: 'github-app';
  readonly configured: boolean;
  getStatus(): GitHubAppStatus;
  assertConfigured(): void;
  listInstallationRepositories(): Promise<GitHubInstallationRepository[]>;
  listRepositoryWorkflows(
    repository: GitHubRepositoryDescriptor,
  ): Promise<GitHubWorkflowDescriptor[]>;
  listWorkflowRuns(
    repository: GitHubRepositoryDescriptor,
    workflowId: string,
  ): Promise<GitHubWorkflowRunDescriptor[]>;
  listWorkflowRunJobs(
    repository: GitHubRepositoryDescriptor,
    workflowRunId: string,
  ): Promise<GitHubWorkflowJobDescriptor[]>;
  listPullRequests(
    repository: GitHubRepositoryDescriptor,
  ): Promise<GitHubPullRequestDescriptor[]>;
  listPullRequestReviewComments(
    repository: GitHubRepositoryDescriptor,
    pullRequestNumber: number,
  ): Promise<GitHubPullRequestReviewCommentDescriptor[]>;
  requestPullRequestCodexReview?(
    repository: GitHubRepositoryDescriptor,
    pullRequestNumber: number,
  ): Promise<void>;
}

export interface GitHubAppStatus {
  mode: 'github-app';
  configured: boolean;
  appId: string | null;
  installationId: string | null;
  webhookConfigured: boolean;
}

export const createGitHubAppBoundary = (
  config: GitHubAppEnv | null,
  options: GitHubAppProviderOptions = {},
): GitHubAppBoundary => new GitHubAppProvider(config, options);
