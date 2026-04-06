#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
. "$SCRIPT_DIR/provider-status.sh"

docker_http_get() {
  socket_path="$1"
  request_path="$2"

  if [ ! -S "$socket_path" ]; then
    return 1
  fi

  curl --silent --show-error --unix-socket "$socket_path" "http://docker$request_path" 2>/dev/null || true
}

DOCKER_PROVIDER_ENABLED="$(normalize_bool "${TRAEFIK_DOCKER_PROVIDER_ENABLED:-false}")"
DOCKER_PROVIDER_ENDPOINT="${TRAEFIK_DOCKER_PROVIDER_ENDPOINT:-unix:///var/run/docker.sock}"
DOCKER_PROVIDER_NETWORK="${TRAEFIK_DOCKER_PROVIDER_NETWORK:-forgeops}"
DOCKER_SOCKET_PATH="$(extract_unix_socket_path "$DOCKER_PROVIDER_ENDPOINT")"
DOCKER_PROVIDER_ACTIVE='false'
DOCKER_PROVIDER_STATUS='file_provider_only'
DOCKER_PROVIDER_REASON='docker_provider_disabled_by_flag'

TRAEFIK_VERSION="$(traefik version 2>/dev/null | awk -F': *' '/^Version:/ { print $2; exit }')"
DOCKER_VERSION='unknown'
DOCKER_API_VERSION='unknown'

if [ -n "$DOCKER_SOCKET_PATH" ] && [ -S "$DOCKER_SOCKET_PATH" ]; then
  VERSION_RESPONSE="$(docker_http_get "$DOCKER_SOCKET_PATH" "/version" || true)"
  if [ -n "$VERSION_RESPONSE" ]; then
    DOCKER_VERSION="$(printf '%s' "$VERSION_RESPONSE" | json_field_from_body "Version")"
    DOCKER_API_VERSION="$(printf '%s' "$VERSION_RESPONSE" | json_field_from_body "ApiVersion")"
  fi
fi

preflight_state="$(resolve_preflight_provider_state "$DOCKER_PROVIDER_ENABLED" "$DOCKER_SOCKET_PATH")"
DOCKER_PROVIDER_STATUS="${preflight_state%%|*}"
remaining_state="${preflight_state#*|}"
DOCKER_PROVIDER_REASON="${remaining_state%%|*}"
DOCKER_PROVIDER_ACTIVE="${preflight_state##*|}"

bootstrap_snapshot="$(build_provider_snapshot \
  "$DOCKER_PROVIDER_STATUS" \
  "$DOCKER_PROVIDER_REASON" \
  "$DOCKER_PROVIDER_NETWORK" \
  0 0 0 '[]' '[]' '[]' 0 0 0 0)"

if [ "$DOCKER_PROVIDER_ACTIVE" = 'true' ]; then
  log_provider_event 'info' 'traefik_provider_bootstrap' \
    'Starting Traefik with file provider and experimental docker provider enabled.' \
    "$DOCKER_PROVIDER_STATUS" \
    "$DOCKER_PROVIDER_REASON" \
    "$bootstrap_snapshot"
else
  log_provider_event 'warn' 'traefik_provider_fallback' \
    'Docker provider unavailable for local runtime; keeping file provider as the stable path.' \
    "$DOCKER_PROVIDER_STATUS" \
    "$DOCKER_PROVIDER_REASON" \
    "$bootstrap_snapshot"
fi

TRAEFIK_DOCKER_PROVIDER_ACTIVE="$DOCKER_PROVIDER_ACTIVE"
TRAEFIK_DOCKER_PROVIDER_REASON="$DOCKER_PROVIDER_REASON"

export TRAEFIK_DOCKER_PROVIDER_ENABLED="$DOCKER_PROVIDER_ENABLED"
export TRAEFIK_DOCKER_PROVIDER_ACTIVE
export TRAEFIK_DOCKER_PROVIDER_REASON
export TRAEFIK_DOCKER_PROVIDER_STATUS="$DOCKER_PROVIDER_STATUS"
export TRAEFIK_DOCKER_PROVIDER_ENDPOINT="$DOCKER_PROVIDER_ENDPOINT"
export TRAEFIK_DOCKER_PROVIDER_NETWORK="$DOCKER_PROVIDER_NETWORK"
export TRAEFIK_DOCKER_API_VERSION="$DOCKER_API_VERSION"

TRAEFIK_ARGS="--configFile=/etc/traefik/traefik.yml"

if [ "$DOCKER_PROVIDER_ACTIVE" = 'true' ]; then
  TRAEFIK_ARGS="$TRAEFIK_ARGS --providers.docker=true --providers.docker.endpoint=$DOCKER_PROVIDER_ENDPOINT --providers.docker.exposedbydefault=false --providers.docker.network=$DOCKER_PROVIDER_NETWORK"
else
  TRAEFIK_ARGS="$TRAEFIK_ARGS --providers.docker=false"
fi

traefik $TRAEFIK_ARGS &
TRAEFIK_PID=$!

/bin/sh /opt/forgeops-traefik/observe-provider.sh &
OBSERVER_PID=$!

shutdown() {
  kill "$OBSERVER_PID" 2>/dev/null || true
  kill "$TRAEFIK_PID" 2>/dev/null || true
}

trap shutdown INT TERM

wait "$TRAEFIK_PID"
TRAEFIK_EXIT_CODE=$?
kill "$OBSERVER_PID" 2>/dev/null || true
wait "$OBSERVER_PID" 2>/dev/null || true
exit "$TRAEFIK_EXIT_CODE"
