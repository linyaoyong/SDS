package com.campus.trade.product.controller;

import com.campus.trade.product.dto.ProductResponse;
import com.campus.trade.product.dto.PageResult;
import com.campus.trade.product.service.FavoriteService;
import com.campus.trade.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    public ApiResponse<PageResult<ProductResponse>> list(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return favoriteService.listMyFavorites(userId, page, size);
    }

    @PostMapping("/{productId}")
    public ApiResponse<Void> favorite(@RequestHeader("X-User-Id") Long userId,
                                      @PathVariable Long productId) {
        return favoriteService.favorite(userId, productId);
    }

    @DeleteMapping("/{productId}")
    public ApiResponse<Void> unfavorite(@RequestHeader("X-User-Id") Long userId,
                                        @PathVariable Long productId) {
        return favoriteService.unfavorite(userId, productId);
    }
}
