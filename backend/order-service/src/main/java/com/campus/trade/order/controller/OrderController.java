package com.campus.trade.order.controller;

import com.campus.trade.order.dto.*;
import com.campus.trade.order.service.OrderService;
import com.campus.trade.order.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final ReviewService reviewService;

    @PostMapping
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request,
                                @RequestHeader("X-User-Id") Long userId) {
        log.info("Creating order: userId={}, productId={}, quantity={}", userId, request.getProductId(), request.getQuantity());
        return orderService.createOrder(request, userId);
    }

    @GetMapping
    public PageResult<OrderResponse> list(
            @RequestParam(required = false, defaultValue = "buyer") String role,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size,
            @RequestHeader("X-User-Id") Long userId) {
        return orderService.listOrders(role, status, page, size, userId);
    }

    @GetMapping("/{id}")
    public OrderResponse get(@PathVariable Long id,
                             @RequestHeader("X-User-Id") Long userId) {
        return orderService.getOrder(id, userId);
    }

    @PutMapping("/{id}/pay")
    public void pay(@PathVariable Long id,
                    @RequestHeader("X-User-Id") Long userId) {
        orderService.pay(id, userId);
    }

    @PutMapping("/{id}/deliver")
    public void deliver(@PathVariable Long id,
                        @RequestHeader("X-User-Id") Long userId) {
        orderService.deliver(id, userId);
    }

    @PutMapping("/{id}/complete")
    public void complete(@PathVariable Long id,
                         @RequestHeader("X-User-Id") Long userId) {
        orderService.complete(id, userId);
    }

    @PutMapping("/{id}/cancel")
    public void cancel(@PathVariable Long id,
                       @Valid @RequestBody CancelRequest request,
                       @RequestHeader("X-User-Id") Long userId) {
        orderService.cancel(id, request.getCancelReason(), userId);
    }

    @PostMapping("/{id}/review")
    public ReviewResponse createReview(@PathVariable Long id,
                                       @Valid @RequestBody ReviewRequest request,
                                       @RequestHeader("X-User-Id") Long userId) {
        return reviewService.createReview(id, request, userId);
    }

    @GetMapping("/{id}/reviews/history")
    public List<ReviewResponse> getReviewHistory(@PathVariable Long id) {
        return reviewService.getReviewHistory(id);
    }
}
