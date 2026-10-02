#!/bin/bash

# ============================================================
# Campus Trade - 一键启动所有后端服务
# ============================================================
# 启动顺序:
#   1. MySQL + Redis (brew services)
#   2. Nacos (注册中心/配置中心, port 8848)
#   3. Sentinel Dashboard (熔断监控, port 8089)
#   4. 编译所有 Java 模块 (mvn clean package -DskipTests)
#   5. Gateway (API 网关, port 8080) — 优先启动
#   6. 并行启动 4 个业务服务:
#      auth-service (8081), product-service (8082),
#      order-service (8083), message-service (8084)
# ============================================================

# ---- Java 版本临时设置 (必须在所有操作之前) ----
export JAVA_HOME="/Users/linyaoyong/Library/Java/JavaVirtualMachines/ms-17.0.16/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

# ---- 颜色输出 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_done()  { echo -e "${GREEN}[DONE]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---- 工具函数: 检查端口是否被占用 ----
port_in_use() {
    lsof -i ":$1" -sTCP:LISTEN >/dev/null 2>&1
}

# ---- 工具函数: 等待端口就绪 ----
wait_for_port() {
    local port=$1
    local label=${2:-"port $port"}
    local max_wait=${3:-60}
    local count=0
    log_info "等待 $label 就绪..."
    while ! port_in_use "$port" && [ $count -lt $max_wait ]; do
        sleep 1
        ((count++))
    done
    if port_in_use "$port"; then
        log_done "$label 已就绪 (${count}s)"
        return 0
    else
        log_error "$label 启动超时 (${max_wait}s)"
        return 1
    fi
}

mkdir -p "$LOG_DIR"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Campus Trade - 后端服务一键启动脚本${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
log_info "JAVA_HOME: $JAVA_HOME"
log_info "java version: $(java -version 2>&1 | head -1)"
log_info "项目目录: $PROJECT_ROOT"
log_info "日志目录: $LOG_DIR"
echo ""

# ============================================================
# Step 1: 检查并启动 MySQL 和 Redis
# ============================================================
echo -e "${YELLOW}--- [1/7] 检查 MySQL & Redis ---${NC}"

# MySQL
if port_in_use 3306; then
    log_done "MySQL 已在运行 (port 3306)"
else
    log_info "启动 MySQL..."
    brew services start mysql 2>/dev/null || brew services start mysql@8.0 2>/dev/null || log_warn "无法启动 MySQL，请手动检查"
    wait_for_port 3306 "MySQL" 30 || log_warn "MySQL 可能启动失败，请手动检查"
fi

# Redis
if port_in_use 6379; then
    log_done "Redis 已在运行 (port 6379)"
else
    log_info "启动 Redis..."
    brew services start redis 2>/dev/null || log_warn "无法启动 Redis，请手动检查"
    wait_for_port 6379 "Redis" 15 || log_warn "Redis 可能启动失败，请手动检查"
fi

echo ""

# ============================================================
# Step 2: 检查并启动 Nacos (注册中心, port 8848)
# ============================================================
echo -e "${YELLOW}--- [2/7] 检查 Nacos (port 8848) ---${NC}"

if port_in_use 8848; then
    log_done "Nacos 已在运行 (port 8848)"
else
    log_info "启动 Nacos (standalone)..."
    sh ~/nacos/bin/startup.sh -m standalone > "$LOG_DIR/nacos.log" 2>&1 &
    wait_for_port 8848 "Nacos" 60 || log_warn "Nacos 可能启动较慢，请稍等或检查 $LOG_DIR/nacos.log"
fi

echo ""

# ============================================================
# Step 3: 检查并启动 Sentinel Dashboard (熔断监控, port 8089)
# ============================================================
echo -e "${YELLOW}--- [3/7] 检查 Sentinel Dashboard (port 8089) ---${NC}"

SENTINEL_JAR="/Users/linyaoyong/CodeProjects/SDS/tools/sentinel-dashboard.jar"

if port_in_use 8089; then
    log_done "Sentinel Dashboard 已在运行 (port 8089)"
else
    if [ -f "$SENTINEL_JAR" ]; then
        log_info "启动 Sentinel Dashboard..."
        nohup java --add-opens=java.base/java.lang=ALL-UNNAMED \
            -jar "$SENTINEL_JAR" \
            --server.port=8089 \
            > "$LOG_DIR/sentinel.log" 2>&1 &
        wait_for_port 8089 "Sentinel Dashboard" 30 || log_warn "Sentinel 可能启动失败"
    else
        log_error "找不到 sentinel-dashboard.jar: $SENTINEL_JAR"
    fi
fi

echo ""

# ============================================================
# Step 4: 编译所有 Java 模块
# ============================================================
echo -e "${YELLOW}--- [4/7] 编译所有模块 (mvn clean package -DskipTests) ---${NC}"

cd "$PROJECT_ROOT"
log_info "正在编译 (首次编译可能需要几分钟，请耐心等待)..."
mvn clean package -DskipTests -q > "$LOG_DIR/maven-build.log" 2>&1
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    log_done "所有模块编译成功"
else
    log_error "编译失败！错误码: $BUILD_EXIT_CODE"
    log_error "请检查日志: $LOG_DIR/maven-build.log"
    echo ""
    echo -e "${RED}=== 最后 30 行编译日志 ===${NC}"
    tail -30 "$LOG_DIR/maven-build.log"
    exit 1
fi

echo ""

# ============================================================
# 微服务启动函数
# ============================================================
start_service() {
    local name=$1
    local port=$2
    local jar_path="$PROJECT_ROOT/$name/target/$name-1.0.0.jar"

    if port_in_use "$port"; then
        log_done "$name 已在运行 (port $port)"
        return 0
    fi

    if [ ! -f "$jar_path" ]; then
        log_error "找不到 jar 文件: $jar_path"
        return 1
    fi

    log_info "启动 $name (port $port)..."
    nohup java -jar "$jar_path" > "$LOG_DIR/$name.log" 2>&1 &
    local pid=$!
    log_info "$name PID=$pid, 日志: $LOG_DIR/$name.log"
    wait_for_port "$port" "$name" 45 || log_warn "$name 启动可能较慢，请查看日志"
    echo ""
}

# ============================================================
# Step 5: 启动 Gateway (优先启动，依赖 Nacos)
# ============================================================
echo -e "${YELLOW}--- [5/7] 启动 Gateway (API 网关, port 8080) ---${NC}"
start_service "gateway" 8080

# ============================================================
# Step 6: 并行启动剩余 4 个业务服务
# ============================================================
echo -e "${YELLOW}--- [6/7] 启动业务服务 ---${NC}"

start_service "auth-service"     8081 &
start_service "product-service"  8082 &
start_service "order-service"    8083 &
start_service "message-service"  8084 &

# 等待所有后台作业完成
wait

echo -e "${YELLOW}--- [7/7] 启动完成总结 ---${NC}"
echo ""

# ============================================================
# 最终状态检查
# ============================================================
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   后端服务状态总览${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

check_and_report() {
    local label=$1
    local port=$2
    if port_in_use "$port"; then
        echo -e "  ${GREEN}✓${NC} $label (port $port)"
    else
        echo -e "  ${RED}✗${NC} $label (port $port)"
    fi
}

echo -e "${BLUE}基础设施:${NC}"
check_and_report "MySQL"               3306
check_and_report "Redis"               6379
check_and_report "Nacos"               8848
check_and_report "Sentinel Dashboard"  8089
echo ""
echo -e "${BLUE}微服务:${NC}"
check_and_report "Gateway"             8080
check_and_report "Auth Service"        8081
check_and_report "Product Service"     8082
check_and_report "Order Service"       8083
check_and_report "Message Service"     8084
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   访问地址:${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Nacos Dashboard:    http://127.0.0.1:8848/nacos"
echo "  Sentinel Dashboard:  http://127.0.0.1:8089"
echo "  Gateway (API):       http://127.0.0.1:8080"
echo "  Swagger UI:          http://127.0.0.1:8080/swagger-ui.html"
echo ""
echo "  日志目录: $LOG_DIR"
echo ""
echo -e "${GREEN}启动脚本执行完毕!${NC}"
