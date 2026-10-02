#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
mkdir -p "$ROOT/.security-reports/sentinel"
# Unit tests use fictional configuration; no personal DB/Nacos credentials.
export MYSQL_PASSWORD=unit-test-placeholder
export JWT_SECRET=unit-test-jwt-key-32-byte-placeholder
export INTERNAL_TOKEN=unit-test-internal-placeholder
export SPRING_CLOUD_NACOS_CONFIG_ENABLED=false
export SPRING_CLOUD_NACOS_DISCOVERY_ENABLED=false
cd "$ROOT/backend"
mvn -B "$@" "-DargLine=-Dcsp.sentinel.log.dir=$ROOT/.security-reports/sentinel -Dspring.cloud.nacos.config.enabled=false -Dspring.cloud.nacos.discovery.enabled=false" test
