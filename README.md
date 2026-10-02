# SDS — 校园二手交易平台

独立完成的校园二手交易平台重构项目，包含 Spring Cloud 微服务后端、React Web 前端和微信小程序。作为课程与个人学习成果保留，当前处于归档阶段。

## 实现内容

- 注册、登录、刷新登录状态、个人资料与收货地址。
- 商品分类、搜索、发布、图片、收藏和点赞。
- 下单、模拟支付、发货、完成、取消与评价。
- 库存扣减、重试补偿、订单超时与幂等记录。
- 会话、未读消息及 WebSocket 即时消息。
- Nacos 配置与发现、Sentinel 限流和演示参数。

## 项目结构

| 目录 | 内容 |
| --- | --- |
| `backend/common` | 公共 DTO、异常、JWT 与 Feign 配置 |
| `backend/gateway` | 统一路由、登录过滤、静态资源 |
| `backend/auth-service` | 用户、认证、地址与头像 |
| `backend/product-service` | 商品、分类、图片与库存 |
| `backend/order-service` | 订单流程、补偿与评价 |
| `backend/message-service` | 消息、会话与 WebSocket |
| `frontend-v2` | React + TypeScript + Vite Web 客户端 |
| `miniapp` | TypeScript 微信小程序客户端 |
| `docs/api-guide.md` | 接口说明；以实际源码为准 |

主要技术版本：Java 17、Spring Boot 3.2.5、Spring Cloud 2023.0.2、Spring Cloud Alibaba 2023.0.1.0、MyBatis Plus 3.5.6；Web 使用 React 19 与 Vite 7。版本保持归档基线，尚未统一升级。

## 本地运行

需要 Java 17、Maven、Node.js 20.19+ 或 22.12+、MySQL、Redis、Nacos。请使用隔离的课程演示环境。

后端配置中的密码、JWT 密钥和内部令牌从环境变量读取，示例见 `.env.example`。每个服务使用同一组 JWT/内部通信设置。`.env` 文件不会被 Spring 自动加载，需要在启动终端导出变量；`JWT_SECRET` 至少 32 字节。可分别使用 `openssl rand -hex 32` 生成本地 JWT 密钥与内部令牌，不要提交生成值。

`backend/scripts/init.sql` 用于创建四个演示数据库，包含 DROP DATABASE；只在专用演示数据库执行，不要对现有业务数据库运行。它只包含结构和商品分类种子数据，没有个人账号或订单导出。

```sh
cd backend
mvn package -DskipTests
mvn spring-boot:run -pl auth-service
```

分别在终端启动 product-service、order-service、message-service，最后启动 gateway。网关默认 8080，各服务为 8081–8084。请先完成本地依赖服务和环境配置；本次审查没有启动完整服务或连接个人数据库。

Web 前端：

```sh
cd frontend-v2
npm ci
npm run dev -- --host 127.0.0.1
```

开发代理将 `/api` 转发到本机网关 8080。

小程序：在微信开发者工具导入 `miniapp/`，按自己的账号设置本地 AppID。仓库使用 `touristappid`，未保留个人 AppID。当前请求地址为本机 localhost，真机调试需要重新配置可访问的演示地址。

## 已验证与限制

- 后端 20 项测试通过；增加了刷新令牌输入验证，避免 Redis 通配符匹配到其他会话，并验证正常令牌旋转。
- 小程序 17 项自动测试通过；Web 前端构建通过，有两处动态导入打包提示。
- 依赖扫描仍有告警，容器与网关也存在待处理风险。
- 小程序与后端的部分接口路径仍需核对；Docker 的路径、服务环境配置和运行权限尚未完整验证。

这是源码展示与学习归档。运行注意事项、扫描范围和剩余风险见 [SECURITY.md](SECURITY.md)。

## 检查入口

```sh
sh scripts/security-check.sh
sh scripts/test-backend.sh
(cd frontend-v2 && npm ci && npm run build)
(cd miniapp && npm ci && npm test)
```

第一个入口需要 Git、Python 3 和 Gitleaks，检查发布文件、配置与全部 Git 历史。后端测试入口使用虚构配置并关闭 Nacos 自动连接。依赖扫描可用 `npm audit`；后端本轮使用 CycloneDX SBOM 和 OSV 扫描，报告保存在本地审查目录。
