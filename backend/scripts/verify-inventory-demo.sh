#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
manifest="$ROOT/docs/tests/output/inventory-demo-manifest.json"
[[ -f "$manifest" ]] || { echo "manifest does not exist: $manifest" >&2; exit 1; }
for command in jq mysql; do command -v "$command" >/dev/null || { echo "required command not found: $command" >&2; exit 1; }; done

run_id=$(jq -er '.runId' "$manifest")
product_id=$(jq -er '.product.id' "$manifest")
product_title=$(jq -er '.product.title' "$manifest")
initial_stock=$(jq -er '.initialStock' "$manifest")
seller_id=$(jq -er '.seller.id' "$manifest")
[[ "$run_id" =~ ^inventory_demo_[0-9]{8}T[0-9]{6}Z_[a-z0-9]{6}$ ]] || { echo "invalid runId" >&2; exit 1; }
[[ "$product_title" == "INVENTORY_DEMO_$run_id" && "$initial_stock" == "10" ]] || { echo "manifest product or initial stock mismatch" >&2; exit 1; }
[[ "$product_id" =~ ^[0-9]+$ && "$seller_id" =~ ^[0-9]+$ ]] || { echo "invalid manifest identifiers" >&2; exit 1; }

: "${MYSQL_PASSWORD:?Set MYSQL_PASSWORD for the isolated demo database}"
mysql_run() { MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "${MYSQL_USERNAME:-root}" "$@"; }
preflight_sql="SELECT CASE WHEN (SELECT COUNT(*) FROM db_product.products WHERE id=$product_id AND seller_id=$seller_id AND title='$product_title') = 1 THEN 'ok' ELSE 'mismatch' END;"
[[ "$(mysql_run -N -s -e "$preflight_sql")" == "ok" ]] || { echo "database preflight failed" >&2; exit 1; }
result=$(mysql_run -N -s -e "SELECT p.stock_quantity, COALESCE(SUM(CASE WHEN r.operation_type = 'DEDUCT' THEN r.quantity ELSE 0 END), 0) FROM db_product.products p LEFT JOIN db_product.stock_operation_records r ON r.product_id = p.id WHERE p.id = $product_id AND p.title = '$product_title' AND p.seller_id = $seller_id GROUP BY p.id, p.stock_quantity;")
IFS=$'\t' read -r remaining deducted <<< "$result"
[[ "$remaining" =~ ^-?[0-9]+$ && "$deducted" =~ ^[0-9]+$ ]] || { echo "invalid database result: $result" >&2; exit 1; }

echo "运行标识: $run_id"
echo "初始库存: $initial_stock"
echo "成功扣减数量: $deducted"
echo "剩余库存: $remaining"
echo "库存守恒: $initial_stock = $deducted + $remaining"

pass=true
(( initial_stock == deducted + remaining )) || pass=false
(( remaining >= 0 )) || pass=false
(( deducted <= initial_stock )) || pass=false
echo "负库存检查: $([[ $remaining -ge 0 ]] && echo PASS || echo FAIL)"
echo "成功扣减未超过初始库存: $([[ $deducted -le $initial_stock ]] && echo PASS || echo FAIL)"
if [[ "$pass" != true ]]; then
  echo "库存一致性校验失败" >&2
  exit 1
fi
echo "库存守恒检查: PASS"
