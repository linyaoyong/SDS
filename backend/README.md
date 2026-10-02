# Campus Trade Backend

## Tech Stack
- Java 17, Spring Boot 3.2.x, Spring Cloud 2023.0.x
- Spring Cloud Alibaba 2023.0.x (Nacos, Sentinel)
- MyBatis Plus 3.5.x, MySQL 8.0, Redis 7

## Architecture
- **gateway** (:8080) — Spring Cloud Gateway, JWT auth, routing
- **auth-service** (:8081) — User management, authentication
- **product-service** (:8082) — Product CRUD, search, stock
- **order-service** (:8083) — Order lifecycle, reviews
- **message-service** (:8084) — Instant messaging, WebSocket

## Prerequisites
- Java 17
- MySQL 8.0 (set MYSQL_PASSWORD locally)
- Redis 7
- Nacos 2.3.2 (localhost:8848)

## Quick Start
1. Start MySQL, Redis, Nacos
2. Run init.sql to create databases
3. Start services: `mvn spring-boot:run -pl auth-service`
4. Start gateway: `mvn spring-boot:run -pl gateway`
5. API docs: http://localhost:8080/swagger-ui.html

## Build
`mvn clean package -DskipTests`

## Docker
`docker-compose up -d`
