FROM maven:3.9-eclipse-temurin-17 AS build
ARG SERVICE_NAME
WORKDIR /app
COPY pom.xml .
COPY common/pom.xml common/
COPY gateway/pom.xml gateway/
COPY auth-service/pom.xml auth-service/
COPY product-service/pom.xml product-service/
COPY order-service/pom.xml order-service/
COPY message-service/pom.xml message-service/

# Download dependencies
RUN mvn dependency:go-offline -pl ${SERVICE_NAME} -am -q || true

COPY common/src common/src/
COPY ${SERVICE_NAME}/src ${SERVICE_NAME}/src/

RUN mvn package -pl ${SERVICE_NAME} -am -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
ARG SERVICE_NAME
WORKDIR /app
COPY --from=build /app/${SERVICE_NAME}/target/*.jar app.jar
RUN mkdir -p /app/static
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
