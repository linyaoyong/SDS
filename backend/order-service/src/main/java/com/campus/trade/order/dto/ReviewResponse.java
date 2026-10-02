package com.campus.trade.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long orderId;
    private Long productId;
    private Long reviewerId;
    private String reviewerName;
    private String reviewerAvatar;
    private Integer rating;
    private String content;
    private LocalDateTime createdAt;
}
