package com.campus.trade.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.springframework.web.reactive.function.server.RouterFunctions.route;
import static org.springframework.web.reactive.function.server.ServerResponse.notFound;
import static org.springframework.web.reactive.function.server.ServerResponse.ok;

@Configuration
public class StaticResourceRouter {

    private static final Path STATIC_DIR = Paths.get("./static").toAbsolutePath().normalize();

    @Bean
    RouterFunction<ServerResponse> staticFileRoutes() {
        return route()
                .GET("/static/**", request -> {
                    String subPath = request.path().substring("/static/".length());
                    return serve(subPath);
                })
                .GET("/api/static/**", request -> {
                    String subPath = request.path().substring("/api/static/".length());
                    return serve(subPath);
                })
                .build();
    }

    private static Mono<ServerResponse> serve(String subPath) {
        Path filePath = STATIC_DIR.resolve(subPath).normalize();
        if (!filePath.startsWith(STATIC_DIR) || !Files.exists(filePath) || Files.isDirectory(filePath)) {
            return notFound().build();
        }
        String lower = subPath.toLowerCase();
        MediaType mt = MediaType.APPLICATION_OCTET_STREAM;
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mt = MediaType.IMAGE_JPEG;
        else if (lower.endsWith(".png")) mt = MediaType.IMAGE_PNG;
        else if (lower.endsWith(".gif")) mt = MediaType.IMAGE_GIF;
        else if (lower.endsWith(".webp")) mt = MediaType.parseMediaType("image/webp");
        return ok().contentType(mt).bodyValue(new FileSystemResource(filePath));
    }
}
