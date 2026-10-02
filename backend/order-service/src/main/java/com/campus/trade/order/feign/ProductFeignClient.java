package com.campus.trade.order.feign;

import com.campus.trade.common.config.FeignConfig;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.dto.StockOperationRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@FeignClient(name = "product-service", path = "/internal", configuration = FeignConfig.class)
public interface ProductFeignClient {

    @PostMapping("/stock/deduct")
    ApiResponse<Void> deductStock(@RequestBody StockOperationRequest request);

    @PostMapping("/stock/restore")
    ApiResponse<Void> restoreStock(@RequestBody StockOperationRequest request);

    @PostMapping("/products/{id}/sold-increment")
    ApiResponse<Void> soldIncrement(@PathVariable("id") Long productId);

    @GetMapping("/products/{id}/info")
    ApiResponse<Map<String, Object>> getProductInfo(@PathVariable("id") Long productId);
}
