package com.campus.trade.product.service;

import com.campus.trade.product.dto.CategoryResponse;
import com.campus.trade.common.dto.ApiResponse;
import java.util.List;

public interface CategoryService {
    ApiResponse<List<CategoryResponse>> getCategoryTree();
}
