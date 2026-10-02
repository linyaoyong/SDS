package com.campus.trade.product.controller;

import com.campus.trade.product.dto.ProductResponse;
import com.campus.trade.product.dto.PageResult;
import com.campus.trade.product.service.LikeService;
import com.campus.trade.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class LikeController {

    private final LikeService likeService;

    @GetMapping("/likes")
    public ApiResponse<PageResult<ProductResponse>> myLikes(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return likeService.listMyLikes(userId, page, size);
    }

    @PostMapping("/{id}/like")
    public ApiResponse<Void> like(@RequestHeader("X-User-Id") Long userId,
                                  @PathVariable Long id) {
        return likeService.like(userId, id);
    }

    @DeleteMapping("/{id}/like")
    public ApiResponse<Void> unlike(@RequestHeader("X-User-Id") Long userId,
                                    @PathVariable Long id) {
        return likeService.unlike(userId, id);
    }
}
