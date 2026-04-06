import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import type { JsonWebKey, KeyObject } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOperatorAuthVerifier } from '../../../infra/auth/create-operator-auth-verifier.js';

const encodeBase64Url = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url');

const signHs256Token = ({
  secret,
  payload,
  header = {},
}: {
  secret: string;
  payload: Record<string, unknown>;
  header?: Record<string, unknown>;
}): string => {
  const encodedHeader = encodeBase64Url(
    JSON.stringify({
      alg: 'HS256',
      typ: 'JWT',
      ...header,
    }),
  );
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
};

const signRs256Token = ({
  privateKey,
  payload,
  header = {},
}: {
  privateKey: KeyObject;
  payload: Record<string, unknown>;
  header?: Record<string, unknown>;
}): string => {
  const encodedHeader = encodeBase64Url(
    JSON.stringify({
      alg: 'RS256',
      typ: 'JWT',
      ...header,
    }),
  );
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign('RSA-SHA256', Buffer.from(signingInput), privateKey).toString(
    'base64url',
  );

  return `${signingInput}.${signature}`;
};

describe('createOperatorAuthVerifier', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should verify a shared-secret token and map the operator principal', async () => {
    const verifier = createOperatorAuthVerifier({
      issuer: 'https://forgeops.local',
      audience: 'forgeops-api',
      verifierSource: {
        type: 'shared-secret',
        sharedSecret: 'local-secret',
      },
    });
    const token = signHs256Token({
      secret: 'local-secret',
      payload: {
        iss: 'https://forgeops.local',
        aud: 'forgeops-api',
        sub: 'operator:local-dev',
        email: 'operator@forgeops.dev',
        name: 'Local Operator',
        capabilities: ['repositories:read', 'repositories:write'],
        exp: Math.floor(Date.now() / 1000) + 300,
      },
    });

    const principal = await verifier.verify({ token });

    expect(principal).toEqual({
      kind: 'operator',
      subject: 'operator:local-dev',
      email: 'operator@forgeops.dev',
      displayName: 'Local Operator',
      capabilities: ['repositories:read', 'repositories:write'],
    });
  });

  it('should reject an invalid shared-secret token', async () => {
    const verifier = createOperatorAuthVerifier({
      issuer: 'https://forgeops.local',
      audience: 'forgeops-api',
      verifierSource: {
        type: 'shared-secret',
        sharedSecret: 'local-secret',
      },
    });
    const token = signHs256Token({
      secret: 'wrong-secret',
      payload: {
        iss: 'https://forgeops.local',
        aud: 'forgeops-api',
        sub: 'operator:local-dev',
        exp: Math.floor(Date.now() / 1000) + 300,
      },
    });

    await expect(verifier.verify({ token })).rejects.toMatchObject({
      code: 'authentication_required',
    });
  });

  it('should verify a jwks token using the configured issuer and audience', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        keys: [
          {
            ...jwk,
            kid: 'local-kid',
          },
        ],
      }),
    } as Response);

    const verifier = createOperatorAuthVerifier({
      issuer: 'https://forgeops.local',
      audience: 'forgeops-api',
      verifierSource: {
        type: 'jwks',
        jwksUrl: 'https://forgeops.local/.well-known/jwks.json',
      },
    });
    const token = signRs256Token({
      privateKey,
      header: {
        kid: 'local-kid',
      },
      payload: {
        iss: 'https://forgeops.local',
        aud: ['forgeops-api'],
        sub: 'operator:jwks',
        scope: 'repositories:read repositories:write',
        exp: Math.floor(Date.now() / 1000) + 300,
      },
    });

    const principal = await verifier.verify({ token });

    expect(principal).toEqual({
      kind: 'operator',
      subject: 'operator:jwks',
      email: null,
      displayName: null,
      capabilities: ['repositories:read', 'repositories:write'],
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
