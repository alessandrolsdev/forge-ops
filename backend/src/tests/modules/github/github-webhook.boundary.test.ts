import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createGitHubWebhookBoundary } from '../../../modules/github/github-webhook.boundary.js';
import { GitHubWebhookVerificationError } from '../../../modules/github/github-app.errors.js';
import { ConfigurationError } from '../../../shared/errors/configuration-error.js';

const createSignatureHeader = (secret: string, payload: string): string => {
  const digest = createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${digest}`;
};

describe('createGitHubWebhookBoundary', () => {
  it('should accept a valid webhook signature', () => {
    const payload = JSON.stringify({
      action: 'completed',
      workflow_run: {
        id: 123,
      },
    });
    const boundary = createGitHubWebhookBoundary({
      GITHUB_APP_ID: '12345678',
      GITHUB_APP_INSTALLATION_ID: '87654321',
      GITHUB_APP_PRIVATE_KEY: 'private-key',
      GITHUB_APP_WEBHOOK_SECRET: 'webhook-secret',
    });

    expect(() =>
      boundary.verifySignature({
        payload,
        signatureHeader: createSignatureHeader('webhook-secret', payload),
      }),
    ).not.toThrow();
  });

  it('should reject an invalid webhook signature with a safe error', () => {
    const boundary = createGitHubWebhookBoundary({
      GITHUB_APP_ID: '12345678',
      GITHUB_APP_INSTALLATION_ID: '87654321',
      GITHUB_APP_PRIVATE_KEY: 'private-key',
      GITHUB_APP_WEBHOOK_SECRET: 'webhook-secret',
    });

    expect(() =>
      boundary.verifySignature({
        payload: '{"action":"completed"}',
        signatureHeader: 'sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    ).toThrowError(GitHubWebhookVerificationError);
  });

  it('should fail closed when webhook verification is used without configuration', () => {
    const boundary = createGitHubWebhookBoundary(null);

    expect(() =>
      boundary.verifySignature({
        payload: '{"action":"completed"}',
        signatureHeader:
          'sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    ).toThrowError(
      new ConfigurationError(
        'GitHub webhook configuration is required before verifying webhook signatures.',
        'github_webhook_not_configured',
      ),
    );
  });
});
