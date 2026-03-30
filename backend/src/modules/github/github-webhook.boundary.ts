import type { GitHubAppEnv } from '../../infra/config/github-app-env.js';
import {
  GitHubWebhookProvider,
  type GitHubWebhookProviderOptions,
} from './providers/github-webhook.provider.js';

export interface GitHubWebhookVerificationInput {
  payload: Buffer | string;
  signatureHeader: string | undefined;
}

export interface GitHubWebhookBoundary {
  readonly configured: boolean;
  assertConfigured(): void;
  verifySignature(input: GitHubWebhookVerificationInput): void;
}

export const createGitHubWebhookBoundary = (
  config: GitHubAppEnv | null,
  options: GitHubWebhookProviderOptions = {},
): GitHubWebhookBoundary => new GitHubWebhookProvider(config, options);
