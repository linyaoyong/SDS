#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
CONFIG_DIR="$ROOT/nacos-config"
NACOS_ADDR=${NACOS_ADDR:-http://127.0.0.1:8848}
NACOS_ADDR=${NACOS_ADDR%/}
GROUP=DEFAULT_GROUP
MARKER='# campus-trade-demo-managed: true'
FORCE=false
DATA_IDS=(product-service.yaml order-service.yaml)

usage() {
  echo "Usage: $0 <apply|status|delete> [--force]" >&2
  exit 64
}

require_command() {
  command -v "$1" >/dev/null || {
    echo "required command not found: $1" >&2
    exit 127
  }
}

fetch_config() {
  local data_id=$1 output=$2 status
  status=$(curl -sS -o "$output" -w '%{http_code}' -G "$NACOS_ADDR/nacos/v1/cs/configs" \
    --data-urlencode "dataId=$data_id" --data-urlencode "group=$GROUP") || {
      echo "Nacos request failed while reading $data_id" >&2
      return 1
    }
  printf '%s' "$status"
}

config_state() {
  local data_id=$1 output=$2 status
  status=$(fetch_config "$data_id" "$output") || return 1
  case "$status" in
    404) printf 'absent' ;;
    200)
      if [[ ! -s "$output" ]]; then
        printf 'absent'
      elif grep -Fqx "$MARKER" "$output"; then
        printf 'managed'
      else
        printf 'unmanaged'
      fi
      ;;
    *)
      echo "Nacos returned HTTP $status while reading $data_id" >&2
      return 1
      ;;
  esac
}

wait_for_state() {
  local data_id=$1 expected=$2 output=$3 state attempt
  for ((attempt = 1; attempt <= 5; attempt++)); do
    state=$(config_state "$data_id" "$output") || return 1
    [[ "$state" == "$expected" ]] && return 0
    (( attempt < 5 )) && sleep 1
  done
  echo "state verification failed for $data_id: expected $expected, got $state" >&2
  return 1
}

publish_config() {
  local data_id=$1 template=$2 response
  response=$(curl -sS -X POST "$NACOS_ADDR/nacos/v1/cs/configs" \
    --data-urlencode "dataId=$data_id" \
    --data-urlencode "group=$GROUP" \
    --data-urlencode "content@$template") || {
      echo "Nacos request failed while publishing $data_id" >&2
      return 1
    }
  [[ "$response" == true ]] || {
    echo "Nacos rejected publish for $data_id: $response" >&2
    return 1
  }
}

delete_config() {
  local data_id=$1 response
  response=$(curl -sS -X DELETE "$NACOS_ADDR/nacos/v1/cs/configs" -G \
    --data-urlencode "dataId=$data_id" \
    --data-urlencode "group=$GROUP") || {
      echo "Nacos request failed while deleting $data_id" >&2
      return 1
    }
  [[ "$response" == true ]] || {
    echo "Nacos rejected delete for $data_id: $response" >&2
    return 1
  }
}

apply_one() {
  local data_id=$1 template="$CONFIG_DIR/$1" current state
  [[ -f "$template" ]] || {
    echo "missing config template: $template" >&2
    return 1
  }
  current=$(mktemp)
  trap 'rm -f "$current"' RETURN
  state=$(config_state "$data_id" "$current") || return 1
  if [[ "$state" == unmanaged && "$FORCE" != true ]]; then
    echo "refusing to overwrite unmanaged config: $data_id (use --force to override)" >&2
    return 1
  fi
  publish_config "$data_id" "$template" || return 1
  wait_for_state "$data_id" managed "$current" || return 1
  echo "$data_id: applied"
}

status_one() {
  local data_id=$1 current state
  current=$(mktemp)
  trap 'rm -f "$current"' RETURN
  state=$(config_state "$data_id" "$current") || return 1
  echo "$data_id: $state"
}

delete_one() {
  local data_id=$1 current state
  current=$(mktemp)
  trap 'rm -f "$current"' RETURN
  state=$(config_state "$data_id" "$current") || return 1
  if [[ "$state" == absent ]]; then
    echo "$data_id: already absent"
    return 0
  fi
  if [[ "$state" == unmanaged && "$FORCE" != true ]]; then
    echo "refusing to delete unmanaged config: $data_id (use --force to override)" >&2
    return 1
  fi
  delete_config "$data_id" || return 1
  wait_for_state "$data_id" absent "$current" || return 1
  echo "$data_id: deleted"
}

require_command curl
[[ $# -ge 1 ]] || usage
COMMAND=$1
shift
if [[ ${1:-} == --force ]]; then
  FORCE=true
  shift
fi
[[ $# -eq 0 ]] || usage

case "$COMMAND" in
  apply)
    for data_id in "${DATA_IDS[@]}"; do apply_one "$data_id"; done
    ;;
  status)
    for data_id in "${DATA_IDS[@]}"; do status_one "$data_id"; done
    ;;
  delete)
    for data_id in "${DATA_IDS[@]}"; do delete_one "$data_id"; done
    ;;
  *) usage ;;
esac
