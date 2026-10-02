package com.campus.trade.order.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName(value = "reviews", autoResultMap = true)
public class Review {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long orderId;
    private Long productId;
    private Long reviewerId;
    private String reviewerName;
    private String reviewerAvatar;
    private Long revieweeId;
    private Integer rating;
    private String content;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> images;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
