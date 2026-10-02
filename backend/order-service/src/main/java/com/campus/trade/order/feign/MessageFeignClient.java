package com.campus.trade.order.feign;

import com.campus.trade.common.config.FeignConfig;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.order.dto.SystemMessageRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "message-service", path = "/internal/messages", configuration = FeignConfig.class)
public interface MessageFeignClient {

    @PostMapping("/system")
    ApiResponse<Void> sendSystemMessage(@RequestBody SystemMessageRequest request);
}
