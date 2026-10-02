package com.campus.trade.product.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.campus.trade.product.entity.enums.Condition;
import com.campus.trade.product.entity.enums.ProductStatus;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName(value = "products", autoResultMap = true)
public class Product {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String title;
    private String description;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Long categoryId;
    private Long sellerId;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> images;
        @TableField("`condition`")
    private Condition condition;
    private Integer stockQuantity;
    private Integer viewCount;
    private Integer likeCount;
    private Integer soldCount;
    private ProductStatus status;
    private String location;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> tags;
    private Integer auditStatus;
    private String auditReason;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
    @Version
    private Integer version;
}
