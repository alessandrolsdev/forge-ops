import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFrontendDevEnv,
  isExecutedDirectly,
  normalizeProxyPort,
  resolveLocalApiBaseUrl,
} from './start-frontend-dev.mjs';

test('normalizeProxyPort should default to 80 when the env var is empty', () => {
  assert.equal(normalizeProxyPort(undefined), '80');
  assert.equal(normalizeProxyPort(''), '80');
  assert.equal(normalizeProxyPort('  '), '80');
});

test('normalizeProxyPort should reject non-numeric values', () => {
  assert.throws(() => normalizeProxyPort('abc'), /FORGEOPS_PROXY_PORT must be a numeric port\./);
});

test('resolveLocalApiBaseUrl should omit :80 for the default proxy port', () => {
  assert.equal(
    resolveLocalApiBaseUrl({
      proxyPort: '80',
    }),
    'http://api.forgeops.local',
  );
});

test('resolveLocalApiBaseUrl should include a non-default proxy port', () => {
  assert.equal(
    resolveLocalApiBaseUrl({
      proxyPort: '8082',
    }),
    'http://api.forgeops.local:8082',
  );
});

test('resolveLocalApiBaseUrl should preserve explicit overrides', () => {
  assert.equal(
    resolveLocalApiBaseUrl({
      explicitBaseUrl: 'https://preview.example.com',
      proxyPort: '8082',
    }),
    'https://preview.example.com',
  );
});

test('createFrontendDevEnv should inject the computed public API base URL', () => {
  const env = createFrontendDevEnv({
    FORGEOPS_PROXY_PORT: '8082',
    NODE_ENV: 'development',
  });

  assert.equal(env.NEXT_PUBLIC_API_BASE_URL, 'http://api.forgeops.local:8082');
  assert.equal(env.NODE_ENV, 'development');
});

test('isExecutedDirectly should be false when imported into tests', () => {
  assert.equal(isExecutedDirectly(), false);
});
