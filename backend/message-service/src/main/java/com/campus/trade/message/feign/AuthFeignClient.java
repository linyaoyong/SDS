package com.campus.trade.message.feign;

import com.campus.trade.common.config.FeignConfig;
import com.campus.trade.common.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@FeignClient(name = "auth-service", path = "/api/users", configuration = FeignConfig.class)
public interface AuthFeignClient {
    @GetMapping("/{id}")
    ApiResponse<Map<String, Object>> getUser(@PathVariable Long id);
}
