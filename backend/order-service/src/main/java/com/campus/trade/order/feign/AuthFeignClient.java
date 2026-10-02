package com.campus.trade.order.feign;

import com.campus.trade.common.config.FeignConfig;
import com.campus.trade.common.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "auth-service", path = "/api/users", configuration = FeignConfig.class)
public interface AuthFeignClient {

    @GetMapping("/{id}")
    ApiResponse<Map<String, Object>> getUser(@PathVariable("id") Long id);

    @GetMapping("/batch")
    ApiResponse<List<Map<String, Object>>> batchGetUsers(@RequestParam("ids") String ids);
}
