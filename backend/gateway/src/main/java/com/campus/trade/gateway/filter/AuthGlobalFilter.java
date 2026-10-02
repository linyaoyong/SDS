package com.campus.trade.gateway.filter;

import com.campus.trade.common.util.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import java.util.List;

@Slf4j
@Component
public class AuthGlobalFilter implements GlobalFilter, Ordered {
    private static final List<String> FULLY_PUBLIC_PATHS = List.of(
            "/api/auth/login", "/api/auth/register", "/api/auth/refresh",
            "/api/static/", "/static/", "/ws/", "/v3/api-docs", "/swagger-ui"
    );

    private static final List<String> READ_PUBLIC_PATHS = List.of(
            "/api/categories", "/api/products"
    );
    private final JwtUtil jwtUtil;
    public AuthGlobalFilter(JwtUtil jwtUtil) { this.jwtUtil = jwtUtil; }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        String method = exchange.getRequest().getMethod() != null ? exchange.getRequest().getMethod().name() : "GET";

        // Fully public paths — no auth needed
        for (String pp : FULLY_PUBLIC_PATHS) { if (path.startsWith(pp)) return chain.filter(exchange); }

        // Try to extract user info from token if present
        String auth = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        Long uid = null;
        Integer role = null;
        if (auth != null && auth.startsWith("Bearer ")) {
            String token = auth.substring(7);
            if (jwtUtil.validateToken(token)) {
                uid = jwtUtil.getUserId(token);
                role = jwtUtil.getRole(token);
            }
        }

        // Read-only public paths — auth header is optional, but if present we forward user info
        boolean isReadPublic = false;
        for (String pp : READ_PUBLIC_PATHS) { if (path.startsWith(pp)) { isReadPublic = true; break; } }
        if (isReadPublic && "GET".equalsIgnoreCase(method)) {
            if (uid != null) {
                ServerHttpRequest req = exchange.getRequest().mutate()
                        .headers(h -> { h.remove("X-User-Id"); h.remove("X-User-Role"); })
                        .header("X-User-Id", uid.toString())
                        .header("X-User-Role", role != null ? role.toString() : "0").build();
                return chain.filter(exchange.mutate().request(req).build());
            }
            return chain.filter(exchange);
        }

        // Authentication required for non-public paths
        if (uid == null) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
        ServerHttpRequest req = exchange.getRequest().mutate()
                .headers(h -> { h.remove("X-User-Id"); h.remove("X-User-Role"); })
                .header("X-User-Id", uid.toString())
                .header("X-User-Role", role != null ? role.toString() : "0").build();
        return chain.filter(exchange.mutate().request(req).build());
    }
    @Override public int getOrder() { return -100; }
}
