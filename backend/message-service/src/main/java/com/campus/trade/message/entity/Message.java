package com.campus.trade.message.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.campus.trade.message.entity.enums.MessageType;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("messages")
public class Message {
    @TableId(type = IdType.AUTO)
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
    private MessageType messageType;
    private String content;
    private String images;
    private Integer isRead;
    private LocalDateTime readAt;
    private Integer isDeletedBySender;
    private Integer isDeletedByReceiver;
    private LocalDateTime createdAt;
}
