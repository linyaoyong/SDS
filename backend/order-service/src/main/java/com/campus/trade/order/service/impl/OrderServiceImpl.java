package com.campus.trade.order.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.constant.RedisKey;
import com.campus.trade.common.dto.StockOperationRequest;
import com.campus.trade.common.exception.BusinessException;
import com.campus.trade.order.dto.CreateOrderRequest;
import com.campus.trade.order.dto.OrderResponse;
import com.campus.trade.order.dto.PageResult;
import com.campus.trade.order.dto.SystemMessageRequest;
import com.campus.trade.order.entity.Order;
import com.campus.trade.order.entity.OrderStatusHistory;
import com.campus.trade.order.entity.enums.OrderStatus;
import com.campus.trade.order.exception.InventoryServiceBusyException;
import com.campus.trade.order.feign.AuthFeignClient;
import com.campus.trade.order.feign.MessageFeignClient;
import com.campus.trade.order.feign.ProductFeignClient;
import com.campus.trade.order.mapper.OrderMapper;
import com.campus.trade.order.mapper.OrderStatusHistoryMapper;
import com.campus.trade.order.service.OrderService;
import com.campus.trade.order.service.ProductAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderMapper orderMapper;
    private final OrderStatusHistoryMapper historyMapper;
    private final ProductFeignClient productFeignClient;
    private final ProductAccessService productAccessService;
    private final AuthFeignClient authFeignClient;
    private final MessageFeignClient messageFeignClient;
    private final StringRedisTemplate redisTemplate;

    @Override
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request, Long userId) {
        // 1. Get product info via Feign
        Map<String, Object> productInfo;
        try {
            productInfo = productAccessService.getProductInfo(request.getProductId());
        } catch (InventoryServiceBusyException exception) {
            throw exception;
        } catch (Exception e) {
            log.error("Failed to fetch product info for productId={}", request.getProductId(), e);
            throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在或服务不可用");
        }
        if (productInfo == null) {
            throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
        }

        Long sellerId = ((Number) productInfo.get("sellerId")).longValue();
        BigDecimal price = new BigDecimal(productInfo.get("price").toString());
        String title = (String) productInfo.get("title");

        // 2. Validate buyer != seller
        if (userId.equals(sellerId)) {
            throw new BusinessException(ErrorCode.CANNOT_BUY_OWN, "不能购买自己的商品");
        }

        // 3. Get user names via Feign (with fallback)
        String buyerName = "User" + userId;
        String sellerName = "User" + sellerId;
        try {
            Map<String, Object> buyerData = authFeignClient.getUser(userId).getData();
            if (buyerData != null && buyerData.get("username") != null) {
                buyerName = (String) buyerData.get("username");
            }
        } catch (Exception e) {
            log.warn("Failed to fetch buyer info for userId={}, using fallback", userId, e);
        }
        try {
            Map<String, Object> sellerData = authFeignClient.getUser(sellerId).getData();
            if (sellerData != null && sellerData.get("username") != null) {
                sellerName = (String) sellerData.get("username");
            }
        } catch (Exception e) {
            log.warn("Failed to fetch seller info for sellerId={}, using fallback", sellerId, e);
        }

        // 4. Generate orderNo
        String orderNo = generateOrderNo();

        // 5. Create Order entity
        BigDecimal totalAmount = price.multiply(BigDecimal.valueOf(request.getQuantity()));
        Order order = new Order();
        order.setOrderNo(orderNo);
        order.setBuyerId(userId);
        order.setSellerId(sellerId);
        order.setProductId(request.getProductId());
        order.setProductTitle(title);
        order.setUnitPrice(price);
        order.setQuantity(request.getQuantity());
        order.setTotalAmount(totalAmount);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setBuyerName(buyerName);
        order.setSellerName(sellerName);
        order.setReceiverName(request.getReceiverName());
        order.setReceiverPhone(request.getReceiverPhone());
        order.setReceiverAddress(request.getReceiverAddress());
        order.setBuyerRemark(request.getBuyerRemark());
        order.setDeductRetryCount(0);
        order.setRestoreRetryCount(0);
        orderMapper.insert(order);

        // Record status history
        recordHistory(order.getId(), null, OrderStatus.PENDING_PAYMENT.getValue(), userId, buyerName, "创建订单");

        // 6. Call product Feign to deduct stock
        StockOperationRequest stockRequest = new StockOperationRequest(orderNo, request.getProductId(), request.getQuantity());
        try {
            productAccessService.deductStock(stockRequest);
            log.info("Stock deducted successfully for orderNo={}", orderNo);
        } catch (Exception e) {
            log.error("Stock deduction failed for orderNo={}, marking as STOCK_DEDUCT_FAILED", orderNo, e);
            order.setStatus(OrderStatus.STOCK_DEDUCT_FAILED);
            order.setDeductRetryCount(1);
            order.setDeductNextRetryTime(LocalDateTime.now().plusMinutes(1));
            orderMapper.updateById(order);
            recordHistory(order.getId(), OrderStatus.PENDING_PAYMENT.getValue(), OrderStatus.STOCK_DEDUCT_FAILED.getValue(),
                    userId, buyerName, "库存扣减失败: " + e.getMessage());
        }

        // 7. Push system message (with Redis dedup)
        pushSystemMessage(order, "ORDER_CREATED", "您的订单已创建，请尽快付款");

        return toResponse(order);
    }

    @Override
    public PageResult<OrderResponse> listOrders(String role, Integer status, Integer page, Integer size, Long userId) {
        if (page == null || page < 1) page = 1;
        if (size == null || size < 1) size = 20;
        if (size > 100) size = 100;

        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        if ("buyer".equalsIgnoreCase(role)) {
            wrapper.eq(Order::getBuyerId, userId);
        } else if ("seller".equalsIgnoreCase(role)) {
            wrapper.eq(Order::getSellerId, userId);
        } else {
            wrapper.and(w -> w.eq(Order::getBuyerId, userId).or().eq(Order::getSellerId, userId));
        }
        if (status != null) {
            wrapper.eq(Order::getStatus, OrderStatus.values()[status]);
        }
        wrapper.orderByDesc(Order::getCreatedAt);

        Page<Order> orderPage = new Page<>(page, size);
        orderPage = orderMapper.selectPage(orderPage, wrapper);

        List<OrderResponse> responses = orderPage.getRecords().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return new PageResult<>(responses, orderPage.getTotal(), page, size);
    }

    @Override
    public OrderResponse getOrder(Long id, Long userId) {
        Order order = orderMapper.selectById(id);
        if (order == null) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
        }
        if (!order.getBuyerId().equals(userId) && !order.getSellerId().equals(userId)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "无权查看此订单");
        }
        return toResponse(order);
    }

    @Override
    @Transactional
    public void pay(Long id, Long userId) {
        Order order = orderMapper.selectById(id);
        if (order == null) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
        }
        if (!order.getBuyerId().equals(userId)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "无权操作此订单");
        }
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw new BusinessException(ErrorCode.STATUS_NOT_ALLOW, "当前状态不允许支付");
        }

        order.setStatus(OrderStatus.PAID);
        order.setPaidAt(LocalDateTime.now());
        orderMapper.updateById(order);
        recordHistory(order.getId(), OrderStatus.PENDING_PAYMENT.getValue(), OrderStatus.PAID.getValue(),
                userId, order.getBuyerName(), "买家已付款");

        pushSystemMessage(order, "ORDER_PAID", "订单已付款，请及时发货");
    }

    @Override
    @Transactional
    public void deliver(Long id, Long userId) {
        Order order = orderMapper.selectById(id);
        if (order == null) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
        }
        if (!order.getSellerId().equals(userId)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "无权操作此订单");
        }
        if (order.getStatus() != OrderStatus.PAID) {
            throw new BusinessException(ErrorCode.STATUS_NOT_ALLOW, "当前状态不允许发货");
        }

        order.setStatus(OrderStatus.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now());
        orderMapper.updateById(order);
        recordHistory(order.getId(), OrderStatus.PAID.getValue(), OrderStatus.DELIVERED.getValue(),
                userId, order.getSellerName(), "卖家已发货");
    }

    @Override
    @Transactional
    public void complete(Long id, Long userId) {
        Order order = orderMapper.selectById(id);
        if (order == null) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
        }
        if (!order.getBuyerId().equals(userId)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "无权操作此订单");
        }
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new BusinessException(ErrorCode.STATUS_NOT_ALLOW, "当前状态不允许确认收货");
        }

        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(LocalDateTime.now());
        orderMapper.updateById(order);
        recordHistory(order.getId(), OrderStatus.DELIVERED.getValue(), OrderStatus.COMPLETED.getValue(),
                userId, order.getBuyerName(), "买家已确认收货");

        // Call sold_increment (best effort)
        try {
            productFeignClient.soldIncrement(order.getProductId());
        } catch (Exception e) {
            log.warn("Failed to increment sold count for productId={}", order.getProductId(), e);
        }
    }

    @Override
    @Transactional
    public void cancel(Long id, String cancelReason, Long userId) {
        if (!StringUtils.hasText(cancelReason)) {
            throw new BusinessException(ErrorCode.CANCEL_REASON_REQUIRED, "取消原因不能为空");
        }

        Order order = orderMapper.selectById(id);
        if (order == null) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
        }

        // Buyer or seller can cancel under certain conditions
        boolean isBuyer = order.getBuyerId().equals(userId);
        boolean isSeller = order.getSellerId().equals(userId);
        if (!isBuyer && !isSeller) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "无权操作此订单");
        }

        // Both buyer and seller can cancel PENDING_PAYMENT or PAID orders
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT && order.getStatus() != OrderStatus.PAID) {
            throw new BusinessException(ErrorCode.STATUS_NOT_ALLOW, "当前状态不允许取消");
        }

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelReason(cancelReason);
        order.setCancelledAt(LocalDateTime.now());
        orderMapper.updateById(order);

        String operatorName = isBuyer ? order.getBuyerName() : order.getSellerName();
        String operatorRole = isBuyer ? "买家" : "卖家";
        recordHistory(order.getId(), oldStatus.getValue(), OrderStatus.CANCELLED.getValue(),
                userId, operatorName, operatorRole + "取消订单: " + cancelReason);

        // Restore stock if the order was paid (stock was deducted)
        if (oldStatus == OrderStatus.PAID || oldStatus == OrderStatus.PENDING_PAYMENT) {
            try {
                StockOperationRequest stockRequest = new StockOperationRequest(order.getOrderNo(), order.getProductId(), order.getQuantity());
                productFeignClient.restoreStock(stockRequest);
                log.info("Stock restored for cancelled orderNo={}", order.getOrderNo());
            } catch (Exception e) {
                log.error("Stock restore failed for cancelled orderNo={}, will retry later", order.getOrderNo(), e);
                order.setRestoreRetryCount(1);
                order.setRestoreNextRetryTime(LocalDateTime.now().plusMinutes(1));
                order.setStatus(OrderStatus.CANCELLED);
                orderMapper.updateById(order);
            }
        }
    }

    // --- Private helpers ---

    private void recordHistory(Long orderId, Integer oldStatus, Integer newStatus, Long operatorId,
                               String operatorName, String remark) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrderId(orderId);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setOperatorId(operatorId);
        history.setOperatorName(operatorName);
        history.setRemark(remark);
        historyMapper.insert(history);
    }

    private void pushSystemMessage(Order order, String eventType, String content) {
        String dedupKey = String.format(RedisKey.MESSAGE_DEDUP, order.getOrderNo(), eventType, order.getStatus().getValue());
        Boolean absent = redisTemplate.opsForValue().setIfAbsent(dedupKey, "1", Duration.ofMinutes(5));
        if (Boolean.TRUE.equals(absent)) {
            try {
                SystemMessageRequest msg = SystemMessageRequest.builder()
                        .orderNo(order.getOrderNo())
                        .productId(order.getProductId())
                        .buyerId(order.getBuyerId())
                        .sellerId(order.getSellerId())
                        .content(content)
                        .eventType(eventType)
                        .newStatus(order.getStatus().getValue())
                        .build();
                messageFeignClient.sendSystemMessage(msg);
            } catch (Exception e) {
                log.warn("Failed to push system message for orderNo={}, event={}", order.getOrderNo(), eventType, e);
            }
        }
    }

    private String generateOrderNo() {
        for (int i = 0; i < 3; i++) {
            String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
            String randomPart = String.format("%06d", ThreadLocalRandom.current().nextInt(1000000));
            String orderNo = datePart + randomPart;
            if (orderMapper.selectCount(new LambdaQueryWrapper<Order>().eq(Order::getOrderNo, orderNo)) == 0) {
                return orderNo;
            }
        }
        throw new BusinessException(ErrorCode.INTERNAL_ERROR, "订单号生成失败");
    }

    private OrderResponse toResponse(Order order) {
        return OrderResponse.builder()
                .id(order.getId())
                .orderNo(order.getOrderNo())
                .buyerId(order.getBuyerId())
                .sellerId(order.getSellerId())
                .productId(order.getProductId())
                .productTitle(order.getProductTitle())
                .unitPrice(order.getUnitPrice())
                .quantity(order.getQuantity())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus() != null ? order.getStatus().getValue() : null)
                .statusLabel(order.getStatus() != null ? order.getStatus().getLabel() : null)
                .buyerName(order.getBuyerName())
                .buyerAvatar(order.getBuyerAvatar())
                .sellerName(order.getSellerName())
                .sellerAvatar(order.getSellerAvatar())
                .receiverName(order.getReceiverName())
                .receiverPhone(order.getReceiverPhone())
                .receiverAddress(order.getReceiverAddress())
                .buyerRemark(order.getBuyerRemark())
                .cancelReason(order.getCancelReason())
                .paidAt(order.getPaidAt())
                .deliveredAt(order.getDeliveredAt())
                .completedAt(order.getCompletedAt())
                .cancelledAt(order.getCancelledAt())
                .createdAt(order.getCreatedAt())
                .build();
    }
}
