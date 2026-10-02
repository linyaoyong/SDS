package com.campus.trade.product.service.impl;

import com.campus.trade.product.dto.CategoryResponse;
import com.campus.trade.product.entity.Category;
import com.campus.trade.product.mapper.CategoryMapper;
import com.campus.trade.product.service.CategoryService;
import com.campus.trade.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryMapper categoryMapper;

    @Override
    public ApiResponse<List<CategoryResponse>> getCategoryTree() {
        List<Category> roots = categoryMapper.selectRootCategories();
        List<CategoryResponse> result = roots.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ApiResponse.success(result);
    }

    private CategoryResponse toResponse(Category c) {
        List<Category> children = categoryMapper.selectChildren(c.getId());
        List<CategoryResponse> childResponses = children != null ? children.stream()
                .map(child -> CategoryResponse.builder()
                        .id(child.getId()).name(child.getName())
                        .description(child.getDescription()).parentId(child.getParentId())
                        .icon(child.getIcon()).sortOrder(child.getSortOrder())
                        .level(child.getLevel()).status(child.getStatus()).build())
                .collect(Collectors.toList()) : List.of();

        return CategoryResponse.builder()
                .id(c.getId()).name(c.getName())
                .description(c.getDescription()).parentId(c.getParentId())
                .icon(c.getIcon()).sortOrder(c.getSortOrder())
                .level(c.getLevel()).status(c.getStatus())
                .children(childResponses)
                .build();
    }
}
