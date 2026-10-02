package com.campus.trade.product.service;

import com.campus.trade.product.dto.ProductResponse;
import com.campus.trade.product.dto.PageResult;
import com.campus.trade.common.dto.ApiResponse;

public interface LikeService {
    ApiResponse<Void> like(Long userId, Long productId);
    ApiResponse<Void> unlike(Long userId, Long productId);
    ApiResponse<PageResult<ProductResponse>> listMyLikes(Long userId, Integer page, Integer size);
}
