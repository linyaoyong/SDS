package com.campus.trade.product.controller;

import com.campus.trade.product.dto.CategoryResponse;
import com.campus.trade.product.service.CategoryService;
import com.campus.trade.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ApiResponse<List<CategoryResponse>> tree() {
        return categoryService.getCategoryTree();
    }
}
