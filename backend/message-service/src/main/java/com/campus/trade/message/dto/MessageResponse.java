package com.campus.trade.message.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class MessageResponse {
    private Long id;
    private Long senderId;
    private String senderName;
    private String senderAvatar;
    private Long receiverId;
    private String receiverName;
    private String receiverAvatar;
    private Long relatedId;
    private String relatedType;
    private Long orderId;
    private String messageType;
    private String content;
    private Integer isRead;
    private LocalDateTime createdAt;
}
