package com.campus.trade.message.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class ConversationResponse {
    private Map<String, Object> otherUser;
    private Map<String, Object> product;
    private Integer unreadCount;
    private Map<String, Object> lastMessage;
    private LocalDateTime updatedAt;
}
