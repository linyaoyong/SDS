package com.campus.trade.product.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ProductResponse {
    private Long id;
    private String title;
    private String description;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private Long categoryId;
    private String categoryName;
    private String parentCategoryName;
    private Long sellerId;
    private String sellerName;
    private String sellerAvatar;
    private List<String> images;
    private Integer condition;
    private String conditionLabel;
    private Integer stockQuantity;
    private Integer viewCount;
    private Integer likeCount;
    private Integer soldCount;
    private Integer status;
    private String statusLabel;
    private String location;
    private List<String> tags;
    private Boolean isFavorited;
    private Integer favoriteCount;
    private LocalDateTime createdAt;
}
