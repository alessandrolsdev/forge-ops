import {
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify as verifySignature,
} from 'node:crypto';
import type { JsonWebKey } from 'node:crypto';
import type { OperatorAuthEnv } from '../config/auth-env.js';
import type { OperatorAuthVerifier } from '../../shared/auth/operator-auth-verifier.js';
import { createOperatorPrincipal } from '../../shared/auth/operator-principal.js';
import { AuthenticationError } from '../../shared/errors/authentication-error.js';

interface JwtHeader {
  alg?: string;
  kid?: string;
}

interface JwtPayload {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  exp?: number;
  nbf?: number;
  email?: string;
  name?: string;
  capabilities?: unknown;
  scope?: string;
}

interface JwksResponse {
  keys?: JsonWebKey[];
}

const AUTH_FAILURE_MESSAGE = 'Authentication failed.';
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

interface ParsedJwt {
  signingInput: string;
  header: JwtHeader;
  payload: JwtPayload;
  signature: Buffer;
}

const parseJsonSegment = <TValue>(segment: string): TValue => {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as TValue;
  } catch {
    throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
  }
};

const parseJwt = (token: string): ParsedJwt => {
  const segments = token.split('.');

  if (segments.length !== 3) {
    throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
  }

  const [encodedHeader, encodedPayload, encodedSignature] = segments;

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
  }

  return {
    signingInput: `${encodedHeader}.${encodedPayload}`,
    header: parseJsonSegment<JwtHeader>(encodedHeader),
    payload: parseJsonSegment<JwtPayload>(encodedPayload),
    signature: Buffer.from(encodedSignature, 'base64url'),
  };
};

const assertTemporalClaims = (payload: JwtPayload): void => {
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (typeof payload.nbf === 'number' && nowSeconds < payload.nbf) {
    throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
  }

  if (typeof payload.exp === 'number' && nowSeconds >= payload.exp) {
    throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
  }
};

const assertIssuerAndAudience = (
  payload: JwtPayload,
  authConfig: OperatorAuthEnv,
): void => {
  if (payload.iss !== authConfig.issuer) {
    throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
  }

  const audience = payload.aud;
  const audienceMatched =
    typeof audience === 'string'
      ? audience === authConfig.audience
      : Array.isArray(audience) && audience.includes(authConfig.audience);

  if (!audienceMatched) {
    throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
  }
};

const toCapabilities = (payload: JwtPayload): string[] => {
  if (Array.isArray(payload.capabilities)) {
    return payload.capabilities.filter(
      (capability): capability is string =>
        typeof capability === 'string' && capability.trim().length > 0,
    );
  }

  if (typeof payload.scope === 'string') {
    return payload.scope
      .split(' ')
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }

  return [];
};

const toPrincipal = (payload: JwtPayload) => {
  if (typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
  }

  return createOperatorPrincipal({
    subject: payload.sub,
    email: payload.email ?? null,
    displayName: payload.name ?? null,
    capabilities: toCapabilities(payload),
  });
};

const createSharedSecretVerifier = (
  authConfig: OperatorAuthEnv,
): OperatorAuthVerifier => {
  if (authConfig.verifierSource.type !== 'shared-secret') {
    throw new Error('Shared-secret verifier requires shared-secret auth config.');
  }

  const sharedSecret = authConfig.verifierSource.sharedSecret;

  return {
    verify: async ({ token }) => {
      const parsedToken = parseJwt(token);

      if (parsedToken.header.alg !== 'HS256') {
        throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
      }

      const expectedSignature = createHmac(
        'sha256',
        sharedSecret,
      )
        .update(parsedToken.signingInput)
        .digest();

      if (
        expectedSignature.length !== parsedToken.signature.length ||
        !timingSafeEqual(expectedSignature, parsedToken.signature)
      ) {
        throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
      }

      assertTemporalClaims(parsedToken.payload);
      assertIssuerAndAudience(parsedToken.payload, authConfig);

      return toPrincipal(parsedToken.payload);
    },
  };
};

const createJwksVerifier = (authConfig: OperatorAuthEnv): OperatorAuthVerifier => {
  if (authConfig.verifierSource.type !== 'jwks') {
    throw new Error('JWKS verifier requires jwks auth config.');
  }

  const jwksUrl = authConfig.verifierSource.jwksUrl;

  let cachedKeys: JsonWebKey[] | null = null;
  let cachedAt = 0;

  const loadJwks = async (): Promise<JsonWebKey[]> => {
    const now = Date.now();

    if (cachedKeys && now - cachedAt < JWKS_CACHE_TTL_MS) {
      return cachedKeys;
    }

    const response = await fetch(jwksUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
    }

    const json = (await response.json()) as JwksResponse;

    if (!Array.isArray(json.keys) || json.keys.length === 0) {
      throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
    }

    cachedKeys = json.keys;
    cachedAt = now;

    return json.keys;
  };

  return {
    verify: async ({ token }) => {
      const parsedToken = parseJwt(token);

      if (parsedToken.header.alg !== 'RS256') {
        throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
      }

      const keys = await loadJwks();
      const matchingKey = keys.find((key) => {
        const kidMatches =
          typeof parsedToken.header.kid === 'string'
            ? key.kid === parsedToken.header.kid
            : true;

        return kidMatches && key.kty === 'RSA';
      });

      if (!matchingKey) {
        throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
      }

      const publicKey = createPublicKey({
        key: matchingKey,
        format: 'jwk',
      });

      const verified = verifySignature(
        'RSA-SHA256',
        Buffer.from(parsedToken.signingInput),
        publicKey,
        parsedToken.signature,
      );

      if (!verified) {
        throw new AuthenticationError(AUTH_FAILURE_MESSAGE);
      }

      assertTemporalClaims(parsedToken.payload);
      assertIssuerAndAudience(parsedToken.payload, authConfig);

      return toPrincipal(parsedToken.payload);
    },
  };
};

export const createOperatorAuthVerifier = (
  authConfig: OperatorAuthEnv,
): OperatorAuthVerifier => {
  if (authConfig.verifierSource.type === 'shared-secret') {
    return createSharedSecretVerifier(authConfig);
  }

  return createJwksVerifier(authConfig);
};
