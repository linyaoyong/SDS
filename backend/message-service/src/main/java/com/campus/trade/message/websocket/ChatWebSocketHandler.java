package com.campus.trade.message.websocket;

import com.campus.trade.common.util.JwtUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatWebSocketHandler implements WebSocketHandler {

    private final SessionManager sessionManager;
    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Long> sessionLastActive = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId == null) {
            try { session.close(); } catch (Exception e) {}
            return;
        }

        sessionManager.addSession(userId, session);
        sessionLastActive.put(session.getId(), System.currentTimeMillis());

        // Start heartbeat checker (every 30s)
        scheduler.scheduleAtFixedRate(() -> {
            try {
                long lastActive = sessionLastActive.getOrDefault(session.getId(), 0L);
                if (System.currentTimeMillis() - lastActive > 90000) {
                    // 90s no activity - send TOKEN_EXPIRED and close
                    if (session.isOpen()) {
                        session.sendMessage(new TextMessage("{\"type\":\"TOKEN_EXPIRED\"}"));
                        session.close();
                    }
                } else if (session.isOpen()) {
                    // Check token expiry every 5 min
                    String token = extractToken(session);
                    if (token != null && !jwtUtil.validateToken(token)) {
                        session.sendMessage(new TextMessage("{\"type\":\"TOKEN_EXPIRED\"}"));
                        session.close();
                    }
                }
            } catch (Exception e) {
                log.debug("Heartbeat check failed for session {}", session.getId());
            }
        }, 30, 30, TimeUnit.SECONDS);
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) {
        sessionLastActive.put(session.getId(), System.currentTimeMillis());

        if (message instanceof TextMessage textMessage) {
            try {
                JsonNode node = objectMapper.readTree(textMessage.getPayload());
                String type = node.has("type") ? node.get("type").asText() : "";

                if ("PING".equals(type)) {
                    // Send PONG response
                    if (session.isOpen()) {
                        synchronized (session) {
                            session.sendMessage(new TextMessage("{\"type\":\"PONG\"}"));
                        }
                    }
                }
                // Other message types are sent via REST API, not WebSocket
            } catch (Exception e) {
                log.warn("Failed to parse WebSocket message: {}", e.getMessage());
            }
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("WebSocket transport error for session {}: {}", session.getId(), exception.getMessage());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) {
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId != null) {
            sessionManager.removeSession(userId, session);
        }
        sessionLastActive.remove(session.getId());
        log.info("WebSocket closed: userId={}, status={}", userId, closeStatus);
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }

    private String extractToken(WebSocketSession session) {
        String query = session.getUri() != null ? session.getUri().getQuery() : null;
        if (query != null) {
            for (String param : query.split("&")) {
                if (param.startsWith("token=")) {
                    return param.substring(6);
                }
            }
        }
        return null;
    }
}
