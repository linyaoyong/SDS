package com.campus.trade.order.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("order_status_histories")
public class OrderStatusHistory {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long orderId;
    private Integer oldStatus;
    private Integer newStatus;
    private Long operatorId;
    private String operatorName;
    private String remark;
    private LocalDateTime createdAt;
}
