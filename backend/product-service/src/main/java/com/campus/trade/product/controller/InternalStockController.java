package com.campus.trade.product.controller;

import com.campus.trade.product.service.StockService;
import com.campus.trade.product.config.ProductDemoDelayConfig;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.dto.StockOperationRequest;
import com.campus.trade.common.exception.BusinessException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/stock")
@RequiredArgsConstructor
public class InternalStockController {

    private final StockService stockService;
    private final ProductDemoDelayConfig productDemoDelayConfig;

    @Value("${internal.token}")
    private String internalToken;

    private void validateInternalToken(String token) {
        if (!internalToken.equals(token)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "无权访问内部接口");
        }
    }

    @PostMapping("/deduct")
    public ApiResponse<Void> deduct(@Valid @RequestBody StockOperationRequest request,
                                    @RequestHeader("X-Internal-Token") String token) {
        validateInternalToken(token);
        productDemoDelayConfig.delayIfConfigured();
        return stockService.deduct(request);
    }

    @PostMapping("/restore")
    public ApiResponse<Void> restore(@Valid @RequestBody StockOperationRequest request,
                                     @RequestHeader("X-Internal-Token") String token) {
        validateInternalToken(token);
        productDemoDelayConfig.delayIfConfigured();
        return stockService.restore(request);
    }
}
