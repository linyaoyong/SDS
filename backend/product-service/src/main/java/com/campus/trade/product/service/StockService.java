package com.campus.trade.product.service;

import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.dto.StockOperationRequest;

public interface StockService {
    ApiResponse<Void> deduct(StockOperationRequest request);
    ApiResponse<Void> restore(StockOperationRequest request);
}
