package com.campus.trade.order.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.campus.trade.order.entity.enums.OrderStatus;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("orders")
public class Order {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String orderNo;
    private Long buyerId;
    private Long sellerId;
    private Long productId;
    private String productTitle;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal totalAmount;
    private OrderStatus status;
    private String buyerName;
    private String buyerAvatar;
    private String sellerName;
    private String sellerAvatar;
    private String receiverName;
    private String receiverPhone;
    private String receiverAddress;
    private String trackingNo;
    private String logisticsCompany;
    private String buyerRemark;
    private String cancelReason;
    private Integer deductRetryCount;
    private LocalDateTime deductNextRetryTime;
    private Integer restoreRetryCount;
    private LocalDateTime restoreNextRetryTime;
    private LocalDateTime paidAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
    @Version
    private Integer version;
}
