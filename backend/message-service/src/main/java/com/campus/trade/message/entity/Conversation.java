package com.campus.trade.message.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("conversations")
public class Conversation {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long productId;
    private Long userAId;
    private Long userBId;
    private String lastMessageContent;
    private LocalDateTime lastMessageAt;
    private Integer userAUnreadCount;
    private Integer userBUnreadCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
