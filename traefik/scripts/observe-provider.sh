#!/bin/sh

set -eu

log_status_json() {
  level="$1"
  event="$2"
  message="$3"
  snapshot_json="$4"

  jq -nc \
    --arg level "$level" \
    --arg event "$event" \
    --arg message "$message" \
    --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --arg docker_endpoint "${TRAEFIK_DOCKER_PROVIDER_ENDPOINT:-unknown}" \
    --arg docker_api_version "${TRAEFIK_DOCKER_API_VERSION:-unknown}" \
    --arg provider_network "${TRAEFIK_DOCKER_PROVIDER_NETWORK:-unknown}" \
    --argjson snapshot "$snapshot_json" \
    '{
      level: $level,
      service: "forgeops-proxy",
      timestamp: $timestamp,
      event: $event,
      message: $message,
      docker_endpoint: $docker_endpoint,
      docker_api_version: $docker_api_version,
      provider_network: $provider_network
    } + $snapshot'
}

fetch_traefik_api() {
  api_path="$1"
  wget -q -O - "http://127.0.0.1:8080$api_path" 2>/dev/null || true
}

fetch_docker_api() {
  api_path="$1"
  curl --silent --show-error --unix-socket /var/run/docker.sock "http://docker$api_path" 2>/dev/null || true
}

provider_snapshot() {
  if [ "${TRAEFIK_DOCKER_PROVIDER_ENABLED:-false}" != 'true' ]; then
    jq -nc --arg provider_network "${TRAEFIK_DOCKER_PROVIDER_NETWORK:-unknown}" '
      {
        status: "file_provider_only",
        degraded_reason: "docker_provider_disabled_by_flag",
        providers_docker_exposed_by_default: false,
        provider_network: $provider_network,
        eligible_containers_count: 0,
        labeled_containers_count: 0,
        containers_with_valid_labels_count: 0,
        containers_without_valid_labels: [],
        containers_with_incomplete_labels: [],
        containers_with_network_override_mismatch: [],
        containers_in_expected_network_count: 0,
        containers_outside_expected_network_count: 0,
        docker_routers_count: 0,
        docker_services_count: 0
      }'
    return
  fi

  if [ "${TRAEFIK_DOCKER_PROVIDER_ACTIVE:-false}" != 'true' ]; then
    jq -nc \
      --arg provider_network "${TRAEFIK_DOCKER_PROVIDER_NETWORK:-unknown}" \
      --arg degraded_reason "${TRAEFIK_DOCKER_PROVIDER_REASON:-docker_provider_preflight_failed}" '
      {
        status: "degraded",
        degraded_reason: $degraded_reason,
        providers_docker_exposed_by_default: false,
        provider_network: $provider_network,
        eligible_containers_count: 0,
        labeled_containers_count: 0,
        containers_with_valid_labels_count: 0,
        containers_without_valid_labels: [],
        containers_with_incomplete_labels: [],
        containers_with_network_override_mismatch: [],
        containers_in_expected_network_count: 0,
        containers_outside_expected_network_count: 0,
        docker_routers_count: 0,
        docker_services_count: 0
      }'
    return
  fi

  ping_response="$(fetch_traefik_api "/ping")"
  if [ "$ping_response" != 'OK' ]; then
    jq -nc \
      --arg provider_network "${TRAEFIK_DOCKER_PROVIDER_NETWORK:-unknown}" '
      {
        status: "starting",
        degraded_reason: "traefik_api_unavailable",
        providers_docker_exposed_by_default: false,
        provider_network: $provider_network,
        eligible_containers_count: 0,
        labeled_containers_count: 0,
        containers_with_valid_labels_count: 0,
        containers_without_valid_labels: [],
        containers_with_incomplete_labels: [],
        containers_with_network_override_mismatch: [],
        containers_in_expected_network_count: 0,
        containers_outside_expected_network_count: 0,
        docker_routers_count: 0,
        docker_services_count: 0
      }'
    return
  fi

  provider_network="${TRAEFIK_DOCKER_PROVIDER_NETWORK:-forgeops}"
  rawdata="$(fetch_traefik_api "/api/rawdata")"
  containers_json="$(fetch_docker_api "/containers/json")"

  if [ -z "$containers_json" ]; then
    jq -nc \
      --arg provider_network "$provider_network" '
      {
        status: "degraded",
        degraded_reason: "docker_api_unavailable",
        providers_docker_exposed_by_default: false,
        provider_network: $provider_network,
        eligible_containers_count: 0,
        labeled_containers_count: 0,
        containers_with_valid_labels_count: 0,
        containers_without_valid_labels: [],
        containers_with_incomplete_labels: [],
        containers_with_network_override_mismatch: [],
        containers_in_expected_network_count: 0,
        containers_outside_expected_network_count: 0,
        docker_routers_count: 0,
        docker_services_count: 0
      }'
    return
  fi

  printf '%s' "$containers_json" | jq -c \
    --arg provider_network "$provider_network" \
    --argjson rawdata "$rawdata" '
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
    def eligible:
      map(
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
    (eligible) as $eligible
    | ($eligible | map(select(.traefik_enable))) as $labeled
    | ($eligible | map(select(.labels_valid))) as $valid
    | ($labeled | map(select(.labels_valid | not) | .name)) as $incomplete_names
    | ($eligible | map(select(.network_override_matches | not) | .name)) as $network_override_mismatch_names
    | ($eligible | map(select(.in_expected_network)) | length) as $in_expected_network_count
    | ($eligible | length) as $eligible_count
    | (docker_routers_count) as $docker_routers_count
    | (docker_services_count) as $docker_services_count
    | {
        status:
          (if $docker_routers_count > 0 or $docker_services_count > 0 then "healthy" else "degraded" end),
        degraded_reason:
          (if $eligible_count == 0 then "no_eligible_containers"
           elif ($labeled | length) == 0 then "containers_without_valid_labels"
           elif ($incomplete_names | length) > 0 then "containers_with_incomplete_labels"
           elif ($eligible_count - $in_expected_network_count) > 0 or ($network_override_mismatch_names | length) > 0 then "network_mismatch"
           elif $docker_routers_count == 0 and $docker_services_count == 0 then "provider_active_but_no_routes_materialized"
           else "none" end),
        providers_docker_exposed_by_default: false,
        provider_network: $provider_network,
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
      }'
}

STATE_FILE='/tmp/forgeops-traefik-provider-state'
INTERVAL_SECONDS="${TRAEFIK_PROVIDER_OBSERVER_INTERVAL_SECONDS:-30}"

while true; do
  snapshot_json="$(provider_snapshot)"
  status_value="$(printf '%s' "$snapshot_json" | jq -r '.status')"
  reason_value="$(printf '%s' "$snapshot_json" | jq -r '.degraded_reason')"
  status_line="$status_value|$reason_value"
  previous_status=''

  if [ -f "$STATE_FILE" ]; then
    previous_status="$(cat "$STATE_FILE" 2>/dev/null || true)"
  fi

  if [ "$previous_status" != "$status_line" ]; then
    printf '%s' "$status_line" > "$STATE_FILE"

    case "$status_value" in
      healthy)
        log_status_json 'info' 'traefik_provider_status' \
          'Docker provider experimental ativo e com rotas detectadas.' \
          "$snapshot_json"
        ;;
      file_provider_only)
        log_status_json 'info' 'traefik_provider_status' \
          'Traefik operando apenas com file provider.' \
          "$snapshot_json"
        ;;
      starting)
        log_status_json 'info' 'traefik_provider_status' \
          'Traefik ainda esta inicializando a observabilidade do provider.' \
          "$snapshot_json"
        ;;
      *)
        log_status_json 'warn' 'traefik_provider_status' \
          'Docker provider degradado; file provider permanece como fallback ativo.' \
          "$snapshot_json"
        ;;
    esac
  fi

  sleep "$INTERVAL_SECONDS"
done
