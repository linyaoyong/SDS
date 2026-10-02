#!/bin/bash

# ============================================================
# Campus Trade - 一键停止所有后端服务
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"

kill_port() {
    local port=$1
    local label=$2
    local pid
    pid=$(lsof -ti ":$port" 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}停止 $label (port $port, PID=$pid)...${NC}"
        kill "$pid" 2>/dev/null
        sleep 1
        # 如果还没死，强制 kill
        kill -9 "$pid" 2>/dev/null
        echo -e "  ${GREEN}✓${NC} $label 已停止"
    else
        echo -e "  - $label 未在运行"
    fi
}

echo ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}   停止 Campus Trade 后端服务${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

echo "停止微服务..."
kill_port 8084 "Message Service"
kill_port 8083 "Order Service"
kill_port 8082 "Product Service"
kill_port 8081 "Auth Service"
kill_port 8080 "Gateway"

echo ""
echo "停止基础设施..."
kill_port 8089 "Sentinel Dashboard"
kill_port 8848 "Nacos"

echo ""
echo -e "${GREEN}所有服务已停止完成!${NC}"
echo -e "(MySQL 和 Redis 保留运行，如需停止请手动: ${YELLOW}brew services stop mysql redis${NC})"
echo ""
