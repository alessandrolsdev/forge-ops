import type {
  GitHubAppBoundary,
  GitHubAppStatus,
  GitHubRepositoryDescriptor,
  GitHubWorkflowDescriptor,
} from '../github-app.boundary.js';
import type { GitHubAppEnv } from '../../../infra/config/github-app-env.js';
import { ConfigurationError } from '../../../shared/errors/configuration-error.js';

const maskIdentifier = (value: string): string => {
  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }

  return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`;
};

export class GitHubAppProvider implements GitHubAppBoundary {
  public readonly mode = 'github-app' as const;
  public readonly configured: boolean;

  private readonly config: GitHubAppEnv | null;

  public constructor(config: GitHubAppEnv | null) {
    this.config = config;
    this.configured = config !== null;
  }

  public getStatus(): GitHubAppStatus {
    return {
      mode: this.mode,
      configured: this.configured,
      appId: this.config ? maskIdentifier(this.config.GITHUB_APP_ID) : null,
      installationId: this.config
        ? maskIdentifier(this.config.GITHUB_APP_INSTALLATION_ID)
        : null,
      webhookConfigured: this.config !== null,
    };
  }

  public assertConfigured(): void {
    if (this.config === null) {
      throw new ConfigurationError(
        'GitHub App configuration is required before using the integration boundary.',
        'github_app_not_configured',
      );
    }
  }

  public async listInstallationRepositories(): Promise<GitHubRepositoryDescriptor[]> {
    this.assertConfigured();
    return [];
  }

  public async listRepositoryWorkflows(
    repository: GitHubRepositoryDescriptor,
  ): Promise<GitHubWorkflowDescriptor[]> {
    this.assertConfigured();
    void repository;
    return [];
  }
}
