package com.campus.trade.product.controller;

import com.campus.trade.product.entity.Product;
import com.campus.trade.product.mapper.ProductMapper;
import com.campus.trade.product.config.ProductDemoDelayConfig;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/internal/products")
@RequiredArgsConstructor
public class InternalProductController {

    private final ProductMapper productMapper;
    private final ProductDemoDelayConfig productDemoDelayConfig;

    @Value("${internal.token}")
    private String internalToken;

    private void validateToken(String token) {
        if (!internalToken.equals(token)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "无权访问内部接口");
        }
    }

    @GetMapping("/{id}/info")
    public ApiResponse<Map<String, Object>> getProductInfo(@PathVariable Long id,
                                                            @RequestHeader("X-Internal-Token") String token) {
        validateToken(token);
        productDemoDelayConfig.delayIfConfigured();
        Product product = productMapper.selectById(id);
        if (product == null) {
            throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
        }
        Map<String, Object> info = Map.of(
            "id", product.getId(),
            "title", product.getTitle(),
            "price", product.getPrice(),
            "sellerId", product.getSellerId(),
            "status", product.getStatus() != null ? product.getStatus().getValue() : null,
            "stockQuantity", product.getStockQuantity()
        );
        return ApiResponse.success(info);
    }

    @PostMapping("/{id}/sold-increment")
    public ApiResponse<Void> soldIncrement(@PathVariable Long id,
                                           @RequestHeader("X-Internal-Token") String token) {
        validateToken(token);
        productMapper.incrementSoldCount(id);
        log.info("Sold count incremented for product {}", id);
        return ApiResponse.success(null);
    }
}
