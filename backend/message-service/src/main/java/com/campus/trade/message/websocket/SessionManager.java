package com.campus.trade.message.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class SessionManager {

    private final ConcurrentHashMap<Long, Set<WebSocketSession>> userSessions = new ConcurrentHashMap<>();

    public void addSession(Long userId, WebSocketSession session) {
        userSessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(session);
        log.info("WebSocket connected: userId={}, total sessions for user={}", userId, getUserSessionCount(userId));
    }

    public void removeSession(Long userId, WebSocketSession session) {
        Set<WebSocketSession> sessions = userSessions.get(userId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                userSessions.remove(userId);
            }
        }
        log.info("WebSocket disconnected: userId={}", userId);
    }

    public Set<WebSocketSession> getSessions(Long userId) {
        return userSessions.getOrDefault(userId, Collections.emptySet());
    }

    public int getUserSessionCount(Long userId) {
        Set<WebSocketSession> sessions = userSessions.get(userId);
        return sessions != null ? sessions.size() : 0;
    }

    public void sendToUser(Long userId, String message) {
        Set<WebSocketSession> sessions = getSessions(userId);
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    synchronized (session) {
                        session.sendMessage(new org.springframework.web.socket.TextMessage(message));
                    }
                } catch (IOException e) {
                    log.error("Failed to send WS message to userId={}: {}", userId, e.getMessage());
                    removeSession(userId, session);
                }
            } else {
                removeSession(userId, session);
            }
        }
    }

    public void removeClosedSessions() {
        userSessions.forEach((userId, sessions) -> {
            sessions.removeIf(session -> !session.isOpen());
            if (sessions.isEmpty()) {
                userSessions.remove(userId);
            }
        });
    }
}
