#!/bin/sh

set -eu

log_json() {
  level="$1"
  event="$2"
  message="$3"
  degraded_reason="${4:-}"

  jq -nc \
    --arg level "$level" \
    --arg event "$event" \
    --arg message "$message" \
    --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --arg traefik_version "${TRAEFIK_VERSION:-unknown}" \
    --arg docker_version "${DOCKER_VERSION:-unknown}" \
    --arg docker_api_version "${DOCKER_API_VERSION:-unknown}" \
    --arg docker_endpoint "${DOCKER_PROVIDER_ENDPOINT:-unknown}" \
    --arg provider_network "${DOCKER_PROVIDER_NETWORK:-unknown}" \
    --arg docker_provider_enabled "${DOCKER_PROVIDER_ENABLED:-false}" \
    --arg docker_provider_active "${DOCKER_PROVIDER_ACTIVE:-false}" \
    --arg degraded_reason "$degraded_reason" \
    '{
      level: $level,
      service: "forgeops-proxy",
      timestamp: $timestamp,
      event: $event,
      message: $message,
      docker_provider_enabled: ($docker_provider_enabled == "true"),
      docker_provider_active: ($docker_provider_active == "true"),
      docker_endpoint: $docker_endpoint,
      docker_api_version: $docker_api_version,
      docker_version: $docker_version,
      traefik_version: $traefik_version,
      provider_network: $provider_network,
      providers_docker_exposed_by_default: false,
      degraded_reason: (if $degraded_reason == "" then null else $degraded_reason end)
    }'
}

normalize_bool() {
  case "${1:-false}" in
    true|TRUE|1|yes|YES|on|ON)
      printf 'true'
      ;;
    *)
      printf 'false'
      ;;
  esac
}

extract_unix_socket_path() {
  endpoint="$1"
  case "$endpoint" in
    unix://*)
      printf '%s' "${endpoint#unix://}"
      ;;
    *)
      printf ''
      ;;
  esac
}

docker_http_get() {
  socket_path="$1"
  request_path="$2"

  if [ ! -S "$socket_path" ]; then
    return 1
  fi

  curl --silent --show-error --unix-socket "$socket_path" "http://docker$request_path" 2>/dev/null || true
}

json_field_from_body() {
  field_name="$1"
  awk -v field_name="$field_name" '
    {
      pattern = "\"" field_name "\":\"[^\"]+\""
      if (match($0, pattern)) {
        value = substr($0, RSTART, RLENGTH)
        sub("^\"" field_name "\":\"", "", value)
        sub("\"$", "", value)
        print value
        exit
      }
    }
  '
}

DOCKER_PROVIDER_ENABLED="$(normalize_bool "${TRAEFIK_DOCKER_PROVIDER_ENABLED:-false}")"
DOCKER_PROVIDER_ENDPOINT="${TRAEFIK_DOCKER_PROVIDER_ENDPOINT:-unix:///var/run/docker.sock}"
DOCKER_PROVIDER_NETWORK="${TRAEFIK_DOCKER_PROVIDER_NETWORK:-forgeops}"
DOCKER_SOCKET_PATH="$(extract_unix_socket_path "$DOCKER_PROVIDER_ENDPOINT")"
DOCKER_PROVIDER_ACTIVE='false'
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

if [ "$DOCKER_PROVIDER_ENABLED" = 'true' ]; then
  if [ -z "$DOCKER_SOCKET_PATH" ]; then
    DOCKER_PROVIDER_REASON='docker_endpoint_not_unix_socket'
    log_json 'warn' 'traefik_provider_fallback' \
      'Docker provider requested but endpoint is not a supported unix socket in local mode; keeping file provider only.' \
      "$DOCKER_PROVIDER_REASON"
  elif [ ! -S "$DOCKER_SOCKET_PATH" ]; then
    DOCKER_PROVIDER_REASON='docker_socket_unavailable'
    log_json 'warn' 'traefik_provider_fallback' \
      'Docker provider requested but docker.sock is unavailable; keeping file provider only.' \
      "$DOCKER_PROVIDER_REASON"
  else
    DOCKER_PROVIDER_ACTIVE='true'
    DOCKER_PROVIDER_REASON='docker_provider_enabled'
    log_json 'info' 'traefik_provider_bootstrap' \
      'Starting Traefik with file provider and experimental docker provider enabled.' \
      "$DOCKER_PROVIDER_REASON"
  fi
else
  log_json 'info' 'traefik_provider_bootstrap' \
    'Starting Traefik with file provider only.' \
    "$DOCKER_PROVIDER_REASON"
fi

TRAEFIK_DOCKER_PROVIDER_ACTIVE="$DOCKER_PROVIDER_ACTIVE"
TRAEFIK_DOCKER_PROVIDER_REASON="$DOCKER_PROVIDER_REASON"

export TRAEFIK_DOCKER_PROVIDER_ENABLED="$DOCKER_PROVIDER_ENABLED"
export TRAEFIK_DOCKER_PROVIDER_ACTIVE
export TRAEFIK_DOCKER_PROVIDER_REASON
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
