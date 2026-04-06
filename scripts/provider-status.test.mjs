import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const repoRoot = process.cwd();
const bashRepoRoot = '/mnt/c/Github/forge-ops';
const jqBinary =
  '/mnt/c/Users/Alessandro/AppData/Local/Microsoft/WinGet/Links/jq.exe';

const runShell = (script) =>
  execFileSync('bash', [], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: `cd ${bashRepoRoot}\n${script}\n`,
  })
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .at(-1) ?? '';

test('classify_provider_status should classify healthy and degraded states', () => {
  assert.equal(
    runShell('. ./traefik/scripts/provider-status.sh\nclassify_provider_status 1 1 0 0 0 2 1'),
    'healthy|none',
  );
  assert.equal(
    runShell('. ./traefik/scripts/provider-status.sh\nclassify_provider_status 0 0 0 0 0 0 0'),
    'degraded|no_eligible_containers',
  );
  assert.equal(
    runShell('. ./traefik/scripts/provider-status.sh\nclassify_provider_status 2 1 1 0 0 0 0'),
    'degraded|containers_with_incomplete_labels',
  );
});

test('resolve_preflight_provider_state should classify bootstrap states', () => {
  assert.equal(
    runShell('. ./traefik/scripts/provider-status.sh\nresolve_preflight_provider_state false /var/run/docker.sock'),
    'file_provider_only|docker_provider_disabled_by_flag|false',
  );
  assert.equal(
    runShell('. ./traefik/scripts/provider-status.sh\nresolve_preflight_provider_state true ""'),
    'degraded|docker_endpoint_not_unix_socket|false',
  );
});

test('json_field_from_body should parse escaped quotes when jq is available', () => {
  const result = runShell(`jq(){ "${jqBinary}" "$@"; }
. ./traefik/scripts/provider-status.sh
printf '%s' '{"Version":"29.3.1 \\"edge\\""}' | json_field_from_body Version`);
  assert.equal(result, '29.3.1 "edge"');
});

test('build_provider_snapshot should preserve counters in degraded fallback', () => {
  const output = runShell(`. ./traefik/scripts/provider-status.sh
jq_available(){ return 1; }
build_provider_snapshot degraded docker_socket_unavailable forgeops 3 2 1 '[]' '[]' '[]' 2 1 4 5`);
  const snapshot = JSON.parse(output);

  assert.equal(snapshot.degraded_reason, 'jq_unavailable');
  assert.equal(snapshot.eligible_containers_count, 3);
  assert.equal(snapshot.docker_routers_count, 4);
  assert.equal(snapshot.docker_services_count, 5);
});

test('build_provider_snapshot should surface jq parse failure explicitly', () => {
  const output = runShell(`. ./traefik/scripts/provider-status.sh
jq(){ return 1; }
build_provider_snapshot degraded docker_socket_unavailable forgeops 0 0 0 '[]' '[]' '[]' 0 0 0 0`);
  const snapshot = JSON.parse(output);

  assert.equal(snapshot.degraded_reason, 'jq_parse_failed');
});

test('log_provider_event fallback should keep snapshot counters visible', () => {
  const output = runShell(`. ./traefik/scripts/provider-status.sh
jq_available(){ return 1; }
export TRAEFIK_DOCKER_PROVIDER_ENABLED=false
export TRAEFIK_DOCKER_PROVIDER_ACTIVE=false
export TRAEFIK_DOCKER_PROVIDER_ENDPOINT=unix:///var/run/docker.sock
export TRAEFIK_DOCKER_API_VERSION=1.54
export TRAEFIK_DOCKER_PROVIDER_NETWORK=forgeops
snapshot='{"status":"degraded","degraded_reason":"jq_unavailable","eligible_containers_count":7,"labeled_containers_count":5,"containers_with_valid_labels_count":4,"docker_routers_count":2,"docker_services_count":3}'
log_provider_event warn traefik_provider_status fallback degraded jq_unavailable "$snapshot"`);
  const payload = JSON.parse(output);

  assert.equal(payload.degraded_reason, 'jq_unavailable');
  assert.equal(payload.eligible_containers_count, 7);
  assert.equal(payload.docker_routers_count, 2);
  assert.equal(payload.docker_services_count, 3);
});
