import { createHmac, timingSafeEqual } from 'node:crypto';
import type { GitHubAppEnv } from '../../../infra/config/github-app-env.js';
import { ConfigurationError } from '../../../shared/errors/configuration-error.js';
import { GitHubWebhookVerificationError } from '../github-app.errors.js';
import type {
  GitHubWebhookBoundary,
  GitHubWebhookVerificationInput,
} from '../github-webhook.boundary.js';

const GITHUB_WEBHOOK_SIGNATURE_PREFIX = 'sha256=';
const GITHUB_WEBHOOK_SIGNATURE_PATTERN = /^[a-f0-9]{64}$/;

export interface GitHubWebhookProviderOptions {
  signatureFactory?: (secret: string, payload: Buffer) => string;
}

export class GitHubWebhookProvider implements GitHubWebhookBoundary {
  public readonly configured: boolean;

  private readonly config: GitHubAppEnv | null;
  private readonly signatureFactory: (secret: string, payload: Buffer) => string;

  public constructor(
    config: GitHubAppEnv | null,
    options: GitHubWebhookProviderOptions = {},
  ) {
    this.config = config;
    this.configured = config !== null;
    this.signatureFactory = options.signatureFactory ?? createGitHubWebhookSignature;
  }

  public assertConfigured(): void {
    if (this.config === null) {
      throw new ConfigurationError(
        'GitHub webhook configuration is required before verifying webhook signatures.',
        'github_webhook_not_configured',
      );
    }
  }

  public verifySignature(input: GitHubWebhookVerificationInput): void {
    this.assertConfigured();

    const receivedSignature = parseSignatureHeader(input.signatureHeader);
    const payload = normalizePayload(input.payload);
    const expectedSignature = this.signatureFactory(
      this.config!.GITHUB_APP_WEBHOOK_SECRET,
      payload,
    );

    if (
      !timingSafeEqual(
        Buffer.from(receivedSignature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8'),
      )
    ) {
      throw new GitHubWebhookVerificationError();
    }
  }
}

const parseSignatureHeader = (value: string | undefined): string => {
  if (!value) {
    throw new GitHubWebhookVerificationError();
  }

  if (!value.startsWith(GITHUB_WEBHOOK_SIGNATURE_PREFIX)) {
    throw new GitHubWebhookVerificationError();
  }

  const normalizedSignature = value
    .slice(GITHUB_WEBHOOK_SIGNATURE_PREFIX.length)
    .trim()
    .toLowerCase();

  if (!GITHUB_WEBHOOK_SIGNATURE_PATTERN.test(normalizedSignature)) {
    throw new GitHubWebhookVerificationError();
  }

  return normalizedSignature;
};

const normalizePayload = (payload: Buffer | string): Buffer =>
  typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;

const createGitHubWebhookSignature = (secret: string, payload: Buffer): string =>
  createHmac('sha256', secret).update(payload).digest('hex');
