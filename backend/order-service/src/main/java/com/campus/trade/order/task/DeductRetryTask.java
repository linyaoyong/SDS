package com.campus.trade.order.task;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.campus.trade.common.constant.RedisKey;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.dto.StockOperationRequest;
import com.campus.trade.order.entity.Order;
import com.campus.trade.order.entity.enums.OrderStatus;
import com.campus.trade.order.feign.ProductFeignClient;
import com.campus.trade.order.mapper.OrderMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DeductRetryTask {

    private final OrderMapper orderMapper;
    private final ProductFeignClient productFeignClient;
    private final StringRedisTemplate redisTemplate;

    @Scheduled(fixedRate = 60000)
    public void retryDeduct() {
        // Redis lock to prevent concurrent execution
        Boolean locked = redisTemplate.opsForValue().setIfAbsent(
                RedisKey.SCHEDULED_DEDUCT_RETRY, "1", Duration.ofMinutes(1));
        if (!Boolean.TRUE.equals(locked)) {
            log.debug("DeductRetryTask skipped - lock not acquired");
            return;
        }
        try {
            // Find orders with STOCK_DEDUCT_FAILED status that are due for retry
            List<Order> failedOrders = orderMapper.selectList(
                    new LambdaQueryWrapper<Order>()
                            .eq(Order::getStatus, OrderStatus.STOCK_DEDUCT_FAILED)
                            .apply("deduct_retry_count < 5")
                            .apply("deduct_next_retry_time IS NULL OR deduct_next_retry_time <= NOW()"));

            for (Order order : failedOrders) {
                try {
                    StockOperationRequest request = new StockOperationRequest(
                            order.getOrderNo(), order.getProductId(), order.getQuantity());
                    ApiResponse<Void> response = productFeignClient.deductStock(request);

                    if (response.getCode() == 200) {
                        // Success: restore to PENDING_PAYMENT
                        order.setStatus(OrderStatus.PENDING_PAYMENT);
                        order.setDeductRetryCount(0);
                        order.setDeductNextRetryTime(null);
                        orderMapper.updateById(order);
                        log.info("DeductRetryTask: stock deducted successfully for orderNo={}", order.getOrderNo());
                    }
                } catch (Exception e) {
                    log.warn("DeductRetryTask: retry failed for orderNo={}, count={}",
                            order.getOrderNo(), order.getDeductRetryCount() + 1, e);
                    // Increment retry count and set next retry time with exponential backoff
                    order.setDeductRetryCount(order.getDeductRetryCount() == null ? 1 : order.getDeductRetryCount() + 1);
                    int backoffMinutes = (int) Math.pow(2, order.getDeductRetryCount());
                    order.setDeductNextRetryTime(LocalDateTime.now().plusMinutes(Math.min(backoffMinutes, 60)));
                    orderMapper.updateById(order);
                }
            }
        } finally {
            redisTemplate.delete(RedisKey.SCHEDULED_DEDUCT_RETRY);
        }
    }
}
