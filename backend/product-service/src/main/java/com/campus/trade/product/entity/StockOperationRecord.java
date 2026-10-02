package com.campus.trade.product.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("stock_operation_records")
public class StockOperationRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String orderNo;
    private Long productId;
    private Integer quantity;
    private String operationType;
    private LocalDateTime createdAt;
}
