import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  createLocalOperatorToken,
  isExecutedDirectly,
  parseArgs,
} from './generate-local-operator-token.mjs';

const decodeToken = (token) => {
  const [encodedHeader, encodedPayload, signature] = token.split('.');

  return {
    header: JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')),
    payload: JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')),
    signature,
    signingInput: `${encodedHeader}.${encodedPayload}`,
  };
};

test('parseArgs should collect repeatable capabilities and subject overrides', () => {
  const parsed = parseArgs([
    '--subject',
    'operator:test',
    '--capability',
    'repositories:read',
    '--capability',
    'repositories:write',
    '--ttl-seconds',
    '120',
  ]);

  assert.deepEqual(parsed, {
    subject: 'operator:test',
    capabilities: ['repositories:read', 'repositories:write'],
    ttlSeconds: 120,
  });
});

test('createLocalOperatorToken should generate an HS256 token with deduped capabilities', () => {
  const token = createLocalOperatorToken({
    issuer: 'forgeops-local',
    audience: 'forgeops-operator',
    sharedSecret: 'local-secret',
    subject: 'operator:test',
    capabilities: [
      'repositories:read',
      'repositories:write',
      'repositories:write',
      '',
    ],
    now: new Date('2026-04-08T18:00:00.000Z'),
    ttlSeconds: 600,
  });
  const decoded = decodeToken(token);
  const expectedSignature = createHmac('sha256', 'local-secret')
    .update(decoded.signingInput)
    .digest('base64url');

  assert.equal(decoded.header.alg, 'HS256');
  assert.equal(decoded.payload.sub, 'operator:test');
  assert.equal(decoded.payload.iss, 'forgeops-local');
  assert.equal(decoded.payload.aud, 'forgeops-operator');
  assert.deepEqual(decoded.payload.capabilities, [
    'repositories:read',
    'repositories:write',
  ]);
  assert.equal(decoded.signature, expectedSignature);
});

test('createLocalOperatorToken should reject missing auth inputs', () => {
  assert.throws(
    () =>
      createLocalOperatorToken({
        issuer: '',
        audience: 'forgeops-operator',
        sharedSecret: 'local-secret',
        subject: 'operator:test',
        capabilities: ['repositories:read'],
      }),
    /OPERATOR_AUTH_ISSUER is required\./,
  );
});

test('isExecutedDirectly should be false when imported into tests', () => {
  assert.equal(isExecutedDirectly(), false);
});

test('script should execute correctly from a path containing spaces', () => {
  const tempDirectory = mkdtempSync(join(tmpdir(), 'forgeops token space '));
  const scriptPath = join(tempDirectory, 'generate local token.mjs');

  copyFileSync(
    new URL('./generate-local-operator-token.mjs', import.meta.url),
    scriptPath,
  );

  try {
    const stdout = execFileSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        OPERATOR_AUTH_MODE: 'shared-secret',
        OPERATOR_AUTH_ISSUER: 'forgeops-local',
        OPERATOR_AUTH_AUDIENCE: 'forgeops-operator',
        OPERATOR_AUTH_SHARED_SECRET: 'local-secret',
      },
    }).trim();
    const decoded = decodeToken(stdout);

    assert.equal(decoded.payload.iss, 'forgeops-local');
    assert.equal(decoded.payload.aud, 'forgeops-operator');
    assert.deepEqual(decoded.payload.capabilities, [
      'repositories:read',
      'repositories:write',
    ]);
  } finally {
    rmSync(tempDirectory, {
      recursive: true,
      force: true,
    });
  }
});
