package com.campus.trade.order.exception;

import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.exception.BusinessException;

/** Raised when Sentinel opens the product-service circuit breaker. */
public class InventoryServiceBusyException extends BusinessException {

    public InventoryServiceBusyException() {
        super(ErrorCode.SERVICE_UNAVAILABLE, "库存服务繁忙，请稍后重试");
    }
}
