package com.campus.trade.common.feign;

import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.dto.CreditScoreUpdateRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "auth-service", path = "/internal/users")
public interface CreditScoreFeignClient {
    @PutMapping("/{userId}/credit-score")
    ApiResponse<Void> updateCreditScore(
        @PathVariable Long userId,
        @RequestBody CreditScoreUpdateRequest request
    );
}
