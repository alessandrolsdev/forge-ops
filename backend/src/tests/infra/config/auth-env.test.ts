import { describe, expect, it } from 'vitest';
import {
  loadOperatorAuthEnv,
  loadOptionalOperatorAuthEnv,
} from '../../../infra/config/auth-env.js';

describe('auth env', () => {
  it('should return null when operator auth is disabled', () => {
    expect(loadOptionalOperatorAuthEnv({})).toBeNull();
    expect(loadOptionalOperatorAuthEnv({ OPERATOR_AUTH_ENABLED: 'false' })).toBeNull();
  });

  it('should parse a jwks-based operator auth config', () => {
    expect(
      loadOperatorAuthEnv({
        OPERATOR_AUTH_ENABLED: 'true',
        OPERATOR_AUTH_ISSUER: 'https://forgeops.example.com',
        OPERATOR_AUTH_AUDIENCE: 'forgeops-api',
        OPERATOR_AUTH_MODE: 'jwks',
        OPERATOR_AUTH_JWKS_URL: 'https://forgeops.example.com/.well-known/jwks.json',
      }),
    ).toEqual({
      issuer: 'https://forgeops.example.com',
      audience: 'forgeops-api',
      verifierSource: {
        type: 'jwks',
        jwksUrl: 'https://forgeops.example.com/.well-known/jwks.json',
      },
    });
  });

  it('should reject partial or contradictory operator auth config', () => {
    expect(() =>
      loadOptionalOperatorAuthEnv({
        OPERATOR_AUTH_ISSUER: 'https://forgeops.example.com',
      }),
    ).toThrow(/OPERATOR_AUTH_ENABLED=true/);

    expect(() =>
      loadOperatorAuthEnv({
        OPERATOR_AUTH_ENABLED: 'true',
        OPERATOR_AUTH_ISSUER: 'https://forgeops.example.com',
        OPERATOR_AUTH_AUDIENCE: 'forgeops-api',
        OPERATOR_AUTH_MODE: 'jwks',
        OPERATOR_AUTH_SHARED_SECRET: 'secret',
      }),
    ).toThrow(/OPERATOR_AUTH_JWKS_URL/);
  });
});
