package com.campus.trade.product.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.trade.product.dto.PageResult;
import com.campus.trade.product.dto.ProductResponse;
import com.campus.trade.product.entity.Favorite;
import com.campus.trade.product.entity.Product;
import com.campus.trade.product.mapper.FavoriteMapper;
import com.campus.trade.product.mapper.ProductMapper;
import com.campus.trade.product.service.FavoriteService;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FavoriteServiceImpl implements FavoriteService {

    private final FavoriteMapper favoriteMapper;
    private final ProductMapper productMapper;

    @Override
    @Transactional
    public ApiResponse<Void> favorite(Long userId, Long productId) {
        // Validate product exists
        if (productMapper.selectById(productId) == null) {
            throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
        }

        // UPSERT: find existing record
        Favorite existing = favoriteMapper.selectOne(new LambdaQueryWrapper<Favorite>()
                .eq(Favorite::getUserId, userId)
                .eq(Favorite::getProductId, productId));

        if (existing != null) {
            existing.setStatus(1);
            favoriteMapper.updateById(existing);
        } else {
            Favorite fav = new Favorite();
            fav.setUserId(userId);
            fav.setProductId(productId);
            fav.setStatus(1);
            favoriteMapper.insert(fav);
        }
        return ApiResponse.success(null);
    }

    @Override
    @Transactional
    public ApiResponse<Void> unfavorite(Long userId, Long productId) {
        Favorite existing = favoriteMapper.selectOne(new LambdaQueryWrapper<Favorite>()
                .eq(Favorite::getUserId, userId)
                .eq(Favorite::getProductId, productId));

        if (existing != null) {
            existing.setStatus(0);
            favoriteMapper.updateById(existing);
        }
        // Idempotent: no error if not favorited
        return ApiResponse.success(null);
    }

    @Override
    public ApiResponse<PageResult<ProductResponse>> listMyFavorites(Long userId, Integer page, Integer size) {
        Page<Favorite> favPage = new Page<>(page, size);
        LambdaQueryWrapper<Favorite> wrapper = new LambdaQueryWrapper<Favorite>()
                .eq(Favorite::getUserId, userId)
                .eq(Favorite::getStatus, 1)
                .orderByDesc(Favorite::getCreatedAt);

        favPage = favoriteMapper.selectPage(favPage, wrapper);

        List<ProductResponse> products = favPage.getRecords().stream()
                .map(fav -> {
                    Product p = productMapper.selectById(fav.getProductId());
                    if (p == null) return null;
                    return ProductResponse.builder()
                            .id(p.getId()).title(p.getTitle()).price(p.getPrice())
                            .images(p.getImages()).status(p.getStatus() != null ? p.getStatus().getValue() : null)
                            .createdAt(p.getCreatedAt()).isFavorited(true).build();
                })
                .filter(p -> p != null)
                .collect(Collectors.toList());

        return ApiResponse.success(new PageResult<>(products, favPage.getTotal(), page, size));
    }
}
