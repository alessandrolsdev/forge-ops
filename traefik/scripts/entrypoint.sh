#!/bin/sh

set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

log_json() {
  level="$1"
  event="$2"
  message="$3"
  details="${4:-}"
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  printf '{"level":"%s","service":"forgeops-proxy","timestamp":"%s","event":"%s","message":"%s"' \
    "$(json_escape "$level")" \
    "$(json_escape "$timestamp")" \
    "$(json_escape "$event")" \
    "$(json_escape "$message")"

  if [ -n "$details" ]; then
    printf ',"details":"%s"' "$(json_escape "$details")"
  fi

  printf '}\n'
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
      "endpoint=$DOCKER_PROVIDER_ENDPOINT traefik_version=$TRAEFIK_VERSION docker_version=$DOCKER_VERSION docker_api_version=$DOCKER_API_VERSION"
  elif [ ! -S "$DOCKER_SOCKET_PATH" ]; then
    DOCKER_PROVIDER_REASON='docker_socket_unavailable'
    log_json 'warn' 'traefik_provider_fallback' \
      'Docker provider requested but docker.sock is unavailable; keeping file provider only.' \
      "socket_path=$DOCKER_SOCKET_PATH traefik_version=$TRAEFIK_VERSION docker_version=$DOCKER_VERSION docker_api_version=$DOCKER_API_VERSION"
  else
    DOCKER_PROVIDER_ACTIVE='true'
    DOCKER_PROVIDER_REASON='docker_provider_enabled'
    log_json 'info' 'traefik_provider_bootstrap' \
      'Starting Traefik with file provider and experimental docker provider enabled.' \
      "endpoint=$DOCKER_PROVIDER_ENDPOINT socket_path=$DOCKER_SOCKET_PATH traefik_version=$TRAEFIK_VERSION docker_version=$DOCKER_VERSION docker_api_version=$DOCKER_API_VERSION"
  fi
else
  log_json 'info' 'traefik_provider_bootstrap' \
    'Starting Traefik with file provider only.' \
    "traefik_version=$TRAEFIK_VERSION docker_version=$DOCKER_VERSION docker_api_version=$DOCKER_API_VERSION"
fi

TRAEFIK_DOCKER_PROVIDER_ACTIVE="$DOCKER_PROVIDER_ACTIVE"
TRAEFIK_DOCKER_PROVIDER_REASON="$DOCKER_PROVIDER_REASON"

export TRAEFIK_DOCKER_PROVIDER_ENABLED="$DOCKER_PROVIDER_ENABLED"
export TRAEFIK_DOCKER_PROVIDER_ACTIVE
export TRAEFIK_DOCKER_PROVIDER_REASON
export TRAEFIK_DOCKER_PROVIDER_ENDPOINT="$DOCKER_PROVIDER_ENDPOINT"

TRAEFIK_ARGS="--configFile=/etc/traefik/traefik.yml"

if [ "$DOCKER_PROVIDER_ACTIVE" = 'true' ]; then
  TRAEFIK_ARGS="$TRAEFIK_ARGS --providers.docker=true --providers.docker.endpoint=$DOCKER_PROVIDER_ENDPOINT --providers.docker.exposedbydefault=false --providers.docker.network=forgeops"
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
