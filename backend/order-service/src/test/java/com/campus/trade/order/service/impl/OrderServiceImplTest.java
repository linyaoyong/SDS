package com.campus.trade.order.service.impl;

import com.campus.trade.order.dto.CreateOrderRequest;
import com.campus.trade.order.exception.InventoryServiceBusyException;
import com.campus.trade.order.feign.AuthFeignClient;
import com.campus.trade.order.feign.MessageFeignClient;
import com.campus.trade.order.feign.ProductFeignClient;
import com.campus.trade.order.mapper.OrderMapper;
import com.campus.trade.order.mapper.OrderStatusHistoryMapper;
import com.campus.trade.order.service.ProductAccessService;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OrderServiceImplTest {

    @Test
    void doesNotPersistOrderWhenProductCircuitBreakerIsOpen() {
        OrderMapper orderMapper = mock(OrderMapper.class);
        OrderStatusHistoryMapper historyMapper = mock(OrderStatusHistoryMapper.class);
        ProductAccessService productAccessService = mock(ProductAccessService.class);
        when(productAccessService.getProductInfo(1L)).thenThrow(new InventoryServiceBusyException());
        OrderServiceImpl orderService = new OrderServiceImpl(orderMapper, historyMapper, mock(ProductFeignClient.class),
                productAccessService, mock(AuthFeignClient.class), mock(MessageFeignClient.class), mock(StringRedisTemplate.class));
        CreateOrderRequest request = CreateOrderRequest.builder()
                .productId(1L)
                .quantity(1)
                .receiverName("测试用户")
                .receiverPhone("13800000000")
                .receiverAddress("测试地址")
                .build();

        assertThatThrownBy(() -> orderService.createOrder(request, 2L))
                .isInstanceOf(InventoryServiceBusyException.class)
                .hasMessage("库存服务繁忙，请稍后重试");
        verifyNoInteractions(orderMapper, historyMapper);
    }
}
