import type { GitHubAppEnv } from '../../infra/config/github-app-env.js';
import {
  GitHubAppProvider,
  type GitHubAppProviderOptions,
} from './providers/github-app.provider.js';

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
  id: string;
  name: string;
  path: string;
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
