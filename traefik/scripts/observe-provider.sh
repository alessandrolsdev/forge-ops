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

fetch_traefik_api() {
  api_path="$1"
  wget -q -O - "http://127.0.0.1:8080$api_path" 2>/dev/null || true
}

current_status() {
  if [ "${TRAEFIK_DOCKER_PROVIDER_ENABLED:-false}" != 'true' ]; then
    printf 'file_provider_only|docker_provider_disabled_by_flag'
    return
  fi

  if [ "${TRAEFIK_DOCKER_PROVIDER_ACTIVE:-false}" != 'true' ]; then
    printf 'degraded|%s' "${TRAEFIK_DOCKER_PROVIDER_REASON:-docker_provider_preflight_failed}"
    return
  fi

  ping_response="$(fetch_traefik_api "/ping")"
  if [ "$ping_response" != 'OK' ]; then
    printf 'starting|traefik_api_unavailable'
    return
  fi

  rawdata="$(fetch_traefik_api "/api/rawdata")"
  if printf '%s' "$rawdata" | grep -q 'forgeops-frontend-docker@docker'; then
    printf 'healthy|docker_routes_detected'
    return
  fi

  if printf '%s' "$rawdata" | grep -q 'forgeops-backend-docker@docker'; then
    printf 'healthy|docker_routes_detected'
    return
  fi

  printf 'degraded|docker_provider_no_routes_detected'
}

STATE_FILE='/tmp/forgeops-traefik-provider-state'
INTERVAL_SECONDS="${TRAEFIK_PROVIDER_OBSERVER_INTERVAL_SECONDS:-30}"

while true; do
  status_line="$(current_status)"
  status_value="${status_line%%|*}"
  reason_value="${status_line#*|}"
  previous_status=''

  if [ -f "$STATE_FILE" ]; then
    previous_status="$(cat "$STATE_FILE" 2>/dev/null || true)"
  fi

  if [ "$previous_status" != "$status_line" ]; then
    printf '%s' "$status_line" > "$STATE_FILE"

    case "$status_value" in
      healthy)
        log_json 'info' 'traefik_provider_status' \
          'Docker provider experimental ativo e com rotas detectadas.' \
          "status=$status_value reason=$reason_value"
        ;;
      file_provider_only)
        log_json 'info' 'traefik_provider_status' \
          'Traefik operando apenas com file provider.' \
          "status=$status_value reason=$reason_value"
        ;;
      starting)
        log_json 'info' 'traefik_provider_status' \
          'Traefik ainda esta inicializando a observabilidade do provider.' \
          "status=$status_value reason=$reason_value"
        ;;
      *)
        log_json 'warn' 'traefik_provider_status' \
          'Docker provider degradado; file provider permanece como fallback ativo.' \
          "status=$status_value reason=$reason_value"
        ;;
    esac
  fi

  sleep "$INTERVAL_SECONDS"
done
