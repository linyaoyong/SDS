package com.campus.trade.product.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class CategoryResponse {
    private Long id;
    private String name;
    private String description;
    private Long parentId;
    private String icon;
    private Integer sortOrder;
    private Integer level;       // 0=一级分类, 1=二级分类
    private Integer status;      // 0=禁用, 1=启用
    private List<CategoryResponse> children;
}
