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
public class RestoreRetryTask {

    private final OrderMapper orderMapper;
    private final ProductFeignClient productFeignClient;
    private final StringRedisTemplate redisTemplate;

    @Scheduled(fixedRate = 60000)
    public void retryRestore() {
        // Redis lock to prevent concurrent execution
        Boolean locked = redisTemplate.opsForValue().setIfAbsent(
                RedisKey.SCHEDULED_RESTORE_RETRY, "1", Duration.ofMinutes(1));
        if (!Boolean.TRUE.equals(locked)) {
            log.debug("RestoreRetryTask skipped - lock not acquired");
            return;
        }
        try {
            // Find CANCELLED orders with restore_retry_count < 5 that are due for retry
            List<Order> failedOrders = orderMapper.selectList(
                    new LambdaQueryWrapper<Order>()
                            .eq(Order::getStatus, OrderStatus.CANCELLED)
                            .isNotNull(Order::getRestoreRetryCount)
                            .gt(Order::getRestoreRetryCount, 0)
                            .lt(Order::getRestoreRetryCount, 5)
                            .apply("restore_next_retry_time IS NULL OR restore_next_retry_time <= NOW()"));

            for (Order order : failedOrders) {
                try {
                    StockOperationRequest request = new StockOperationRequest(
                            order.getOrderNo(), order.getProductId(), order.getQuantity());
                    ApiResponse<Void> response = productFeignClient.restoreStock(request);

                    if (response.getCode() == 200) {
                        // Success: clear retry fields
                        order.setRestoreRetryCount(0);
                        order.setRestoreNextRetryTime(null);
                        orderMapper.updateById(order);
                        log.info("RestoreRetryTask: stock restored successfully for orderNo={}", order.getOrderNo());
                    }
                } catch (Exception e) {
                    log.warn("RestoreRetryTask: retry failed for orderNo={}, count={}",
                            order.getOrderNo(), order.getRestoreRetryCount() + 1, e);
                    // Increment retry count and set next retry time with exponential backoff
                    order.setRestoreRetryCount(order.getRestoreRetryCount() == null ? 1 : order.getRestoreRetryCount() + 1);
                    int backoffMinutes = (int) Math.pow(2, order.getRestoreRetryCount());
                    order.setRestoreNextRetryTime(LocalDateTime.now().plusMinutes(Math.min(backoffMinutes, 60)));
                    orderMapper.updateById(order);
                }
            }
        } finally {
            redisTemplate.delete(RedisKey.SCHEDULED_RESTORE_RETRY);
        }
    }
}
