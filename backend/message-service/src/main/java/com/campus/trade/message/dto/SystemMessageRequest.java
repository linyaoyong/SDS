package com.campus.trade.message.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemMessageRequest {
    private String orderNo;
    private Long productId;
    private Long buyerId;
    private Long sellerId;
    private String content;
    private String eventType;
    private Integer newStatus;
}
