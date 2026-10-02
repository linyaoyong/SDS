package com.campus.trade.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private Long id;
    private String orderNo;
    private Long buyerId;
    private Long sellerId;
    private Long productId;
    private String productTitle;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal totalAmount;
    private Integer status;
    private String statusLabel;
    private String buyerName;
    private String buyerAvatar;
    private String sellerName;
    private String sellerAvatar;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String buyerRemark;
    private String cancelReason;
    private LocalDateTime paidAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    private LocalDateTime createdAt;
}
