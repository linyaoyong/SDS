package com.campus.trade.product.feign;

import com.campus.trade.common.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@FeignClient(name = "order-service", path = "/internal/orders")
public interface OrderFeignClient {

    @GetMapping("/reviews/by-product/{productId}")
    ApiResponse<Map<String, Object>> getReviewsByProduct(
            @PathVariable Long productId,
            @RequestParam Integer page,
            @RequestParam Integer size);
}
