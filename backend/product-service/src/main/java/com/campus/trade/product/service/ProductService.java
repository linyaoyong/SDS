package com.campus.trade.product.service;

import com.campus.trade.product.dto.*;
import com.campus.trade.common.dto.ApiResponse;

public interface ProductService {
    ApiResponse<PageResult<ProductResponse>> listProducts(String keyword, Long categoryId,
            Boolean mine, Integer page, Integer size, String sortBy, Long userId);
    ApiResponse<ProductResponse> getProduct(Long id, Long userId);
    ApiResponse<ProductResponse> createProduct(ProductRequest request, Long userId);
    ApiResponse<ProductResponse> updateProduct(Long id, ProductRequest request, Long userId);
    ApiResponse<Void> offShelf(Long id, Long userId);
    ApiResponse<Void> reList(Long id, Long userId);
    ApiResponse<Void> deleteProduct(Long id, Long userId);

    ApiResponse<Void> addProductImage(Long productId, String imageUrl, Long userId);
}
