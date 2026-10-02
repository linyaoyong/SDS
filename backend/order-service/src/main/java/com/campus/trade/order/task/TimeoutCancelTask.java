package com.campus.trade.order.task;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.constant.RedisKey;
import com.campus.trade.common.exception.BusinessException;
import com.campus.trade.order.entity.Order;
import com.campus.trade.order.entity.OrderStatusHistory;
import com.campus.trade.order.entity.enums.OrderStatus;
import com.campus.trade.order.mapper.OrderMapper;
import com.campus.trade.order.mapper.OrderStatusHistoryMapper;
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
public class TimeoutCancelTask {

    private final OrderMapper orderMapper;
    private final OrderStatusHistoryMapper historyMapper;
    private final StringRedisTemplate redisTemplate;

    @Scheduled(fixedRate = 60000)
    public void cancelTimeoutOrders() {
        // Redis lock to prevent concurrent execution
        Boolean locked = redisTemplate.opsForValue().setIfAbsent(
                RedisKey.SCHEDULED_TIMEOUT_CANCEL, "1", Duration.ofMinutes(1));
        if (!Boolean.TRUE.equals(locked)) {
            log.debug("TimeoutCancelTask skipped - lock not acquired");
            return;
        }
        try {
            // Find PENDING_PAYMENT orders older than 30 minutes
            LocalDateTime deadline = LocalDateTime.now().minusMinutes(30);
            List<Order> timeoutOrders = orderMapper.selectList(
                    new LambdaQueryWrapper<Order>()
                            .eq(Order::getStatus, OrderStatus.PENDING_PAYMENT)
                            .lt(Order::getCreatedAt, deadline));

            for (Order order : timeoutOrders) {
                try {
                    order.setStatus(OrderStatus.CANCELLED);
                    order.setCancelReason(ErrorCode.ORDER_TIMEOUT_CANCELLED + "");
                    order.setCancelledAt(LocalDateTime.now());
                    orderMapper.updateById(order);

                    // Record history
                    OrderStatusHistory history = new OrderStatusHistory();
                    history.setOrderId(order.getId());
                    history.setOldStatus(OrderStatus.PENDING_PAYMENT.getValue());
                    history.setNewStatus(OrderStatus.CANCELLED.getValue());
                    history.setOperatorId(0L);
                    history.setOperatorName("系统");
                    history.setRemark("超时未支付，系统自动取消");
                    historyMapper.insert(history);

                    log.info("TimeoutCancelTask: cancelled timeout orderNo={}", order.getOrderNo());
                } catch (Exception e) {
                    log.error("TimeoutCancelTask: failed to cancel orderNo={}", order.getOrderNo(), e);
                }
            }
        } finally {
            redisTemplate.delete(RedisKey.SCHEDULED_TIMEOUT_CANCEL);
        }
    }
}
