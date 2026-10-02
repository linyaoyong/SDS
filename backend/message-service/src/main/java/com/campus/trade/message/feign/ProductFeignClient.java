package com.campus.trade.message.feign;

import com.campus.trade.common.config.FeignConfig;
import com.campus.trade.common.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@FeignClient(name = "product-service", path = "/internal/products", configuration = FeignConfig.class)
public interface ProductFeignClient {
    @GetMapping("/{id}/info")
    ApiResponse<Map<String, Object>> getProductInfo(@PathVariable Long id);
}
