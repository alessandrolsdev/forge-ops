#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
. "$SCRIPT_DIR/provider-status.sh"

fetch_traefik_api() {
  api_path="$1"
  wget -q -O - "http://127.0.0.1:8080$api_path" 2>/dev/null || true
}

fetch_docker_api() {
  api_path="$1"
  curl --silent --show-error --unix-socket /var/run/docker.sock "http://docker$api_path" 2>/dev/null || true
}

provider_snapshot() {
  provider_network="${TRAEFIK_DOCKER_PROVIDER_NETWORK:-forgeops}"

  if [ "${TRAEFIK_DOCKER_PROVIDER_ENABLED:-false}" != 'true' ]; then
    build_provider_snapshot \
      'file_provider_only' \
      'docker_provider_disabled_by_flag' \
      "$provider_network" \
      0 0 0 '[]' '[]' '[]' 0 0 0 0
    return
  fi

  if [ "${TRAEFIK_DOCKER_PROVIDER_ACTIVE:-false}" != 'true' ]; then
    build_provider_snapshot \
      "${TRAEFIK_DOCKER_PROVIDER_STATUS:-degraded}" \
      "${TRAEFIK_DOCKER_PROVIDER_REASON:-docker_provider_preflight_failed}" \
      "$provider_network" \
      0 0 0 '[]' '[]' '[]' 0 0 0 0
    return
  fi

  ping_response="$(fetch_traefik_api "/ping")"
  if [ "$ping_response" != 'OK' ]; then
    build_provider_snapshot \
      'starting' \
      'traefik_api_unavailable' \
      "$provider_network" \
      0 0 0 '[]' '[]' '[]' 0 0 0 0
    return
  fi

  if ! jq_available; then
    build_provider_snapshot \
      'degraded' \
      'jq_unavailable' \
      "$provider_network" \
      0 0 0 '[]' '[]' '[]' 0 0 0 0
    return
  fi

  rawdata="$(fetch_traefik_api "/api/rawdata")"
  containers_json="$(fetch_docker_api "/containers/json")"

  if [ -z "$containers_json" ]; then
    build_provider_snapshot \
      'degraded' \
      'docker_api_unavailable' \
      "$provider_network" \
      0 0 0 '[]' '[]' '[]' 0 0 0 0
    return
  fi

  if ! printf '%s' "$rawdata" | jq -e '. | type == "object"' >/dev/null 2>&1; then
    build_provider_snapshot \
      'degraded' \
      'jq_parse_failed' \
      "$provider_network" \
      0 0 0 '[]' '[]' '[]' 0 0 0 0
    return
  fi

  if ! printf '%s' "$containers_json" | jq -e '. | type == "array"' >/dev/null 2>&1; then
    build_provider_snapshot \
      'degraded' \
      'jq_parse_failed' \
      "$provider_network" \
      0 0 0 '[]' '[]' '[]' 0 0 0 0
    return
  fi

  metrics_json="$(
    jq -cn \
      --arg provider_network "$provider_network" \
      --argjson rawdata "$rawdata" \
      --argjson containers "$containers_json" '
      def container_name:
        (.Names[0] // .Id // "unknown") | ltrimstr("/");
      def labels:
        .Labels // {};
      def service_name:
        labels["com.docker.compose.service"] // "";
      def project_name:
        labels["com.docker.compose.project"] // "";
      def network_names:
        (.NetworkSettings.Networks // {}) | keys;
      def in_expected_network($network):
        (network_names | index($network)) != null;
      def has_router_rule:
        (labels | keys | map(select(test("^traefik\\.http\\.routers\\.[^.]+\\.rule$"))) | length) > 0;
      def has_router_entrypoints:
        (labels | keys | map(select(test("^traefik\\.http\\.routers\\.[^.]+\\.entrypoints$"))) | length) > 0;
      def has_service_port:
        (labels | keys | map(select(test("^traefik\\.http\\.services\\.[^.]+\\.loadbalancer\\.server\\.port$"))) | length) > 0;
      def enable_true:
        labels["traefik.enable"] == "true";
      def network_override:
        labels["traefik.docker.network"] // null;
      def eligible($all_containers):
        $all_containers
        | map(
            select(project_name == "forge-ops" and service_name != "proxy")
            | {
                name: container_name,
                service: service_name,
                traefik_enable: enable_true,
                has_router_rule: has_router_rule,
                has_router_entrypoints: has_router_entrypoints,
                has_service_port: has_service_port,
                in_expected_network: in_expected_network($provider_network),
                network_override: network_override,
                network_override_matches: ((network_override // $provider_network) == $provider_network),
                labels_valid: (enable_true and has_router_rule and has_router_entrypoints and has_service_port)
              }
          );
      def docker_routers_count:
        ($rawdata.routers // {} | to_entries | map(select(.key | endswith("@docker"))) | length);
      def docker_services_count:
        ($rawdata.services // {} | to_entries | map(select(.key | endswith("@docker"))) | length);
      (eligible($containers)) as $eligible
      | ($eligible | map(select(.traefik_enable))) as $labeled
      | ($eligible | map(select(.labels_valid))) as $valid
      | ($labeled | map(select(.labels_valid | not) | .name)) as $incomplete_names
      | ($eligible | map(select(.network_override_matches | not) | .name)) as $network_override_mismatch_names
      | ($eligible | map(select(.in_expected_network)) | length) as $in_expected_network_count
      | ($eligible | length) as $eligible_count
      | (docker_routers_count) as $docker_routers_count
      | (docker_services_count) as $docker_services_count
      | {
          eligible_containers_count: $eligible_count,
          labeled_containers_count: ($labeled | length),
          containers_with_valid_labels_count: ($valid | length),
          containers_without_valid_labels: ($eligible | map(select(.labels_valid | not) | .name)),
          containers_with_incomplete_labels: $incomplete_names,
          containers_with_network_override_mismatch: $network_override_mismatch_names,
          containers_in_expected_network_count: $in_expected_network_count,
          containers_outside_expected_network_count: ($eligible_count - $in_expected_network_count),
          docker_routers_count: $docker_routers_count,
          docker_services_count: $docker_services_count
        }' 2>/dev/null
  )" || metrics_json=''

  if [ -z "$metrics_json" ]; then
    build_provider_snapshot \
      'degraded' \
      'jq_parse_failed' \
      "$provider_network" \
      0 0 0 '[]' '[]' '[]' 0 0 0 0
    return
  fi

  eligible_containers_count="$(printf '%s' "$metrics_json" | jq -r '.eligible_containers_count')"
  labeled_containers_count="$(printf '%s' "$metrics_json" | jq -r '.labeled_containers_count')"
  containers_with_incomplete_labels_count="$(printf '%s' "$metrics_json" | jq -r '.containers_with_incomplete_labels | length')"
  containers_with_network_override_mismatch_count="$(printf '%s' "$metrics_json" | jq -r '.containers_with_network_override_mismatch | length')"
  containers_outside_expected_network_count="$(printf '%s' "$metrics_json" | jq -r '.containers_outside_expected_network_count')"
  docker_routers_count="$(printf '%s' "$metrics_json" | jq -r '.docker_routers_count')"
  docker_services_count="$(printf '%s' "$metrics_json" | jq -r '.docker_services_count')"

  status_and_reason="$(classify_provider_status \
    "$eligible_containers_count" \
    "$labeled_containers_count" \
    "$containers_with_incomplete_labels_count" \
    "$containers_outside_expected_network_count" \
    "$containers_with_network_override_mismatch_count" \
    "$docker_routers_count" \
    "$docker_services_count")"
  status_value="${status_and_reason%%|*}"
  reason_value="${status_and_reason#*|}"

  build_provider_snapshot \
    "$status_value" \
    "$reason_value" \
    "$provider_network" \
    "$eligible_containers_count" \
    "$labeled_containers_count" \
    "$(printf '%s' "$metrics_json" | jq -r '.containers_with_valid_labels_count')" \
    "$(printf '%s' "$metrics_json" | jq -c '.containers_without_valid_labels')" \
    "$(printf '%s' "$metrics_json" | jq -c '.containers_with_incomplete_labels')" \
    "$(printf '%s' "$metrics_json" | jq -c '.containers_with_network_override_mismatch')" \
    "$(printf '%s' "$metrics_json" | jq -r '.containers_in_expected_network_count')" \
    "$containers_outside_expected_network_count" \
    "$docker_routers_count" \
    "$docker_services_count"
}

STATE_FILE='/tmp/forgeops-traefik-provider-state'
INTERVAL_SECONDS="${TRAEFIK_PROVIDER_OBSERVER_INTERVAL_SECONDS:-30}"

while true; do
  snapshot_json="$(provider_snapshot)"

  if jq_available; then
    status_value="$(printf '%s' "$snapshot_json" | jq -r '.status' 2>/dev/null || printf 'degraded')"
    reason_value="$(printf '%s' "$snapshot_json" | jq -r '.degraded_reason' 2>/dev/null || printf 'jq_parse_failed')"
  else
    status_value="$(json_field_or_default 'status' 'degraded' "$snapshot_json")"
    reason_value="$(json_field_or_default 'degraded_reason' 'jq_unavailable' "$snapshot_json")"
  fi

  status_line="$status_value|$reason_value"
  previous_status=''

  if [ -f "$STATE_FILE" ]; then
    previous_status="$(cat "$STATE_FILE" 2>/dev/null || true)"
  fi

  if [ "$previous_status" != "$status_line" ]; then
    printf '%s' "$status_line" > "$STATE_FILE"

    case "$status_value" in
      healthy)
        log_provider_event 'info' 'traefik_provider_status' \
          'Docker provider experimental ativo e com rotas detectadas.' \
          "$status_value" \
          "$reason_value" \
          "$snapshot_json"
        ;;
      file_provider_only)
        log_provider_event 'info' 'traefik_provider_status' \
          'Traefik operando apenas com file provider.' \
          "$status_value" \
          "$reason_value" \
          "$snapshot_json"
        ;;
      starting)
        log_provider_event 'info' 'traefik_provider_status' \
          'Traefik ainda esta inicializando a observabilidade do provider.' \
          "$status_value" \
          "$reason_value" \
          "$snapshot_json"
        ;;
      *)
        log_provider_event 'warn' 'traefik_provider_status' \
          'Docker provider degradado; file provider permanece como fallback ativo.' \
          "$status_value" \
          "$reason_value" \
          "$snapshot_json"
        ;;
    esac
  fi

  sleep "$INTERVAL_SECONDS"
done
