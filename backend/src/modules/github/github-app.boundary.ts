import type { GitHubAppEnv } from '../../infra/config/github-app-env.js';
import { GitHubAppProvider } from './providers/github-app.provider.js';

export interface GitHubRepositoryDescriptor {
  owner: string;
  name: string;
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
  listInstallationRepositories(): Promise<GitHubRepositoryDescriptor[]>;
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
): GitHubAppBoundary => new GitHubAppProvider(config);
