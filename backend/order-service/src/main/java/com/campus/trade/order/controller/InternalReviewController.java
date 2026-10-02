package com.campus.trade.order.controller;

import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
import com.campus.trade.order.dto.PageResult;
import com.campus.trade.order.dto.ReviewResponse;
import com.campus.trade.order.service.ReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/internal/orders")
@RequiredArgsConstructor
public class InternalReviewController {

    private final ReviewService reviewService;

    @Value("${internal.token}")
    private String internalToken;

    private void validateToken(String token) {
        if (!internalToken.equals(token)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "无权访问内部接口");
        }
    }

    @GetMapping("/reviews/by-product/{productId}")
    public ApiResponse<PageResult<ReviewResponse>> getReviewsByProduct(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestHeader("X-Internal-Token") String token) {
        validateToken(token);
        PageResult<ReviewResponse> result = reviewService.getReviewsByProduct(productId, page, size);
        return ApiResponse.success(result);
    }

    @GetMapping("/reviews/{orderId}/history")
    public ApiResponse<List<ReviewResponse>> getReviewHistory(@PathVariable Long orderId,
                                                               @RequestHeader("X-Internal-Token") String token) {
        validateToken(token);
        List<ReviewResponse> history = reviewService.getReviewHistory(orderId);
        return ApiResponse.success(history);
    }
}
