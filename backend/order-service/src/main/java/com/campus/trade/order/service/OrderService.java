package com.campus.trade.order.service;

import com.campus.trade.order.dto.CreateOrderRequest;
import com.campus.trade.order.dto.OrderResponse;
import com.campus.trade.order.dto.PageResult;

public interface OrderService {

    OrderResponse createOrder(CreateOrderRequest request, Long userId);

    PageResult<OrderResponse> listOrders(String role, Integer status, Integer page, Integer size, Long userId);

    OrderResponse getOrder(Long id, Long userId);

    void pay(Long id, Long userId);

    void deliver(Long id, Long userId);

    void complete(Long id, Long userId);

    void cancel(Long id, String cancelReason, Long userId);
}
