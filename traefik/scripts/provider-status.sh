#!/bin/sh

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

jq_available() {
  command -v jq >/dev/null 2>&1
}

json_field_or_default() {
  field_name="$1"
  default_value="$2"
  json_input="${3:-}"

  if [ -n "$json_input" ]; then
    field_value="$(printf '%s' "$json_input" | json_field_from_body "$field_name" 2>/dev/null || true)"
    if [ -n "$field_value" ]; then
      printf '%s' "$field_value"
      return
    fi
  fi

  printf '%s' "$default_value"
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\r\n' '  '
}

build_provider_snapshot() {
  status="$1"
  degraded_reason="$2"
  provider_network="$3"
  eligible_containers_count="${4:-0}"
  labeled_containers_count="${5:-0}"
  containers_with_valid_labels_count="${6:-0}"
  containers_without_valid_labels_json="${7:-[]}"
  containers_with_incomplete_labels_json="${8:-[]}"
  containers_with_network_override_mismatch_json="${9:-[]}"
  containers_in_expected_network_count="${10:-0}"
  containers_outside_expected_network_count="${11:-0}"
  docker_routers_count="${12:-0}"
  docker_services_count="${13:-0}"

  if jq_available; then
    snapshot_json="$(
      jq -nc \
        --arg status "$status" \
        --arg degraded_reason "$degraded_reason" \
        --arg provider_network "$provider_network" \
        --argjson eligible_containers_count "$eligible_containers_count" \
        --argjson labeled_containers_count "$labeled_containers_count" \
        --argjson containers_with_valid_labels_count "$containers_with_valid_labels_count" \
        --argjson containers_without_valid_labels "$containers_without_valid_labels_json" \
        --argjson containers_with_incomplete_labels "$containers_with_incomplete_labels_json" \
        --argjson containers_with_network_override_mismatch "$containers_with_network_override_mismatch_json" \
        --argjson containers_in_expected_network_count "$containers_in_expected_network_count" \
        --argjson containers_outside_expected_network_count "$containers_outside_expected_network_count" \
        --argjson docker_routers_count "$docker_routers_count" \
        --argjson docker_services_count "$docker_services_count" \
        '{
          status: $status,
          degraded_reason: $degraded_reason,
          providers_docker_exposed_by_default: false,
          provider_network: $provider_network,
          eligible_containers_count: $eligible_containers_count,
          labeled_containers_count: $labeled_containers_count,
          containers_with_valid_labels_count: $containers_with_valid_labels_count,
          containers_without_valid_labels: $containers_without_valid_labels,
          containers_with_incomplete_labels: $containers_with_incomplete_labels,
          containers_with_network_override_mismatch: $containers_with_network_override_mismatch,
          containers_in_expected_network_count: $containers_in_expected_network_count,
          containers_outside_expected_network_count: $containers_outside_expected_network_count,
          docker_routers_count: $docker_routers_count,
          docker_services_count: $docker_services_count
        }' 2>/dev/null
    )" || snapshot_json=''

    if [ -n "$snapshot_json" ]; then
      printf '%s' "$snapshot_json"
      return
    fi

    degraded_reason='jq_parse_failed'
  else
    degraded_reason='jq_unavailable'
  fi

  printf '{"status":"%s","degraded_reason":"%s","providers_docker_exposed_by_default":false,"provider_network":"%s","eligible_containers_count":%s,"labeled_containers_count":%s,"containers_with_valid_labels_count":%s,"containers_without_valid_labels":[],"containers_with_incomplete_labels":[],"containers_with_network_override_mismatch":[],"containers_in_expected_network_count":%s,"containers_outside_expected_network_count":%s,"docker_routers_count":%s,"docker_services_count":%s}' \
    "$(json_escape "$status")" \
    "$(json_escape "$degraded_reason")" \
    "$(json_escape "$provider_network")" \
    "$eligible_containers_count" \
    "$labeled_containers_count" \
    "$containers_with_valid_labels_count" \
    "$containers_in_expected_network_count" \
    "$containers_outside_expected_network_count" \
    "$docker_routers_count" \
    "$docker_services_count"
}

classify_provider_status() {
  eligible_containers_count="${1:-0}"
  labeled_containers_count="${2:-0}"
  containers_with_incomplete_labels_count="${3:-0}"
  containers_outside_expected_network_count="${4:-0}"
  containers_with_network_override_mismatch_count="${5:-0}"
  docker_routers_count="${6:-0}"
  docker_services_count="${7:-0}"

  if [ "$eligible_containers_count" -eq 0 ]; then
    printf 'degraded|no_eligible_containers'
  elif [ "$labeled_containers_count" -eq 0 ]; then
    printf 'degraded|containers_without_valid_labels'
  elif [ "$containers_with_incomplete_labels_count" -gt 0 ]; then
    printf 'degraded|containers_with_incomplete_labels'
  elif [ "$containers_outside_expected_network_count" -gt 0 ] || [ "$containers_with_network_override_mismatch_count" -gt 0 ]; then
    printf 'degraded|network_mismatch'
  elif [ "$docker_routers_count" -gt 0 ] || [ "$docker_services_count" -gt 0 ]; then
    printf 'healthy|none'
  else
    printf 'degraded|provider_active_but_no_routes_materialized'
  fi
}

resolve_preflight_provider_state() {
  docker_provider_enabled="$1"
  docker_socket_path="$2"

  if [ "$docker_provider_enabled" != 'true' ]; then
    printf 'file_provider_only|docker_provider_disabled_by_flag|false'
  elif [ -z "$docker_socket_path" ]; then
    printf 'degraded|docker_endpoint_not_unix_socket|false'
  elif [ ! -S "$docker_socket_path" ]; then
    printf 'degraded|docker_socket_unavailable|false'
  else
    printf 'starting|docker_provider_enabled|true'
  fi
}

log_provider_event() {
  level="$1"
  event="$2"
  message="$3"
  status="$4"
  degraded_reason="$5"
  snapshot_json="${6:-}"

  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  docker_endpoint="${TRAEFIK_DOCKER_PROVIDER_ENDPOINT:-unknown}"
  docker_api_version="${TRAEFIK_DOCKER_API_VERSION:-unknown}"
  provider_network="${TRAEFIK_DOCKER_PROVIDER_NETWORK:-unknown}"
  docker_provider_enabled="$(normalize_bool "${TRAEFIK_DOCKER_PROVIDER_ENABLED:-false}")"
  docker_provider_active="$(normalize_bool "${TRAEFIK_DOCKER_PROVIDER_ACTIVE:-false}")"
  traefik_version="${TRAEFIK_VERSION:-unknown}"
  docker_version="${DOCKER_VERSION:-unknown}"
  log_fallback_reason='none'

  if jq_available && [ -n "$snapshot_json" ]; then
    log_output="$(
      jq -nc \
        --arg level "$level" \
        --arg event "$event" \
        --arg message "$message" \
        --arg timestamp "$timestamp" \
        --arg traefik_version "$traefik_version" \
        --arg docker_version "$docker_version" \
        --arg docker_api_version "$docker_api_version" \
        --arg docker_endpoint "$docker_endpoint" \
        --arg provider_network "$provider_network" \
        --arg docker_provider_enabled "$docker_provider_enabled" \
        --arg docker_provider_active "$docker_provider_active" \
        --argjson snapshot "$snapshot_json" \
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
          provider_network: $provider_network
        } + $snapshot' 2>/dev/null
    )" || log_output=''

    if [ -n "$log_output" ]; then
      printf '%s\n' "$log_output"
      return
    fi

    log_fallback_reason='jq_parse_failed'
  elif ! jq_available; then
    log_fallback_reason='jq_unavailable'
  else
    log_fallback_reason='snapshot_unavailable'
  fi

  printf '{"level":"%s","service":"forgeops-proxy","timestamp":"%s","event":"%s","message":"%s","docker_provider_enabled":%s,"docker_provider_active":%s,"docker_endpoint":"%s","docker_api_version":"%s","docker_version":"%s","traefik_version":"%s","provider_network":"%s","status":"%s","degraded_reason":"%s","log_fallback_reason":"%s"}\n' \
    "$(json_escape "$level")" \
    "$(json_escape "$timestamp")" \
    "$(json_escape "$event")" \
    "$(json_escape "$message")" \
    "$docker_provider_enabled" \
    "$docker_provider_active" \
    "$(json_escape "$docker_endpoint")" \
    "$(json_escape "$docker_api_version")" \
    "$(json_escape "$docker_version")" \
    "$(json_escape "$traefik_version")" \
    "$(json_escape "$provider_network")" \
    "$(json_escape "$status")" \
    "$(json_escape "$degraded_reason")" \
    "$(json_escape "$log_fallback_reason")"
}
