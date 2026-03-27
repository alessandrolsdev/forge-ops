import { describe, expect, it } from 'vitest';
import {
  loadGitHubAppEnv,
  loadOptionalGitHubAppEnv,
} from '../../../infra/config/github-app-env.js';

describe('GitHub App env loaders', () => {
  it('should return null when no GitHub App variables are provided', () => {
    expect(loadOptionalGitHubAppEnv({})).toBeNull();
  });

  it('should reject partially configured GitHub App values', () => {
    expect(() =>
      loadOptionalGitHubAppEnv({
        GITHUB_APP_ID: '123',
      }),
    ).toThrowError();
  });

  it('should require all GitHub App variables for strict loading', () => {
    expect(() => loadGitHubAppEnv({})).toThrowError();
  });
});

