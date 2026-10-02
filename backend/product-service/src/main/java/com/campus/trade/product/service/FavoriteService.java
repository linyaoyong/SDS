package com.campus.trade.product.service;

import com.campus.trade.product.dto.ProductResponse;
import com.campus.trade.product.dto.PageResult;
import com.campus.trade.common.dto.ApiResponse;

public interface FavoriteService {
    ApiResponse<Void> favorite(Long userId, Long productId);
    ApiResponse<Void> unfavorite(Long userId, Long productId);
    ApiResponse<PageResult<ProductResponse>> listMyFavorites(Long userId, Integer page, Integer size);
}
