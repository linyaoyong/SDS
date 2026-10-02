package com.campus.trade.order.service;

import com.alibaba.csp.sentinel.slots.block.degrade.DegradeRuleManager;
import com.alibaba.csp.sentinel.slots.clusterbuilder.ClusterBuilderSlot;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.dto.StockOperationRequest;
import com.campus.trade.common.exception.BusinessException;
import com.campus.trade.order.config.ResilienceDemoConfig;
import com.campus.trade.order.exception.InventoryServiceBusyException;
import com.campus.trade.order.feign.ProductFeignClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProductAccessServiceTest {

    private final ProductFeignClient productFeignClient = Mockito.mock(ProductFeignClient.class);
    private final ResilienceDemoConfig resilienceConfig = new ResilienceDemoConfig();

    @AfterEach
    void clearRules() {
        DegradeRuleManager.loadRules(java.util.List.of());
        ClusterBuilderSlot.resetClusterNodes();
    }

    @Test
    void returnsProductInfoWhenDownstreamCallIsHealthy() {
        configureCircuitBreaker(20, 1);
        when(productFeignClient.getProductInfo(1L)).thenReturn(ApiResponse.success(Map.of("id", 1L)));
        ProductAccessService productAccessService = createProductAccessService();

        Map<String, Object> result = productAccessService.getProductInfo(1L);

        assertThat(result).containsEntry("id", 1L);
        verify(productFeignClient).getProductInfo(1L);
    }

    @Test
    void rejectsNextCallWithoutFeignAfterSlowCallsTripCircuitBreaker() throws Exception {
        configureCircuitBreaker(10, 5);
        when(productFeignClient.getProductInfo(1L)).thenAnswer(invocation -> {
            Thread.sleep(30);
            return ApiResponse.success(Map.of("id", 1L));
        });
        ProductAccessService productAccessService = createProductAccessService();

        for (int i = 0; i < 5; i++) {
            productAccessService.getProductInfo(1L);
        }

        assertThatThrownBy(() -> productAccessService.getProductInfo(1L))
                .isInstanceOf(InventoryServiceBusyException.class)
                .hasMessage("库存服务繁忙，请稍后重试");
        verify(productFeignClient, times(5)).getProductInfo(1L);
    }

    @Test
    void keepsSlowCallStatisticsLongEnoughForSequentialCircuitDemo() {
        configureCircuitBreaker(1_000, 5);
        ReflectionTestUtils.setField(resilienceConfig, "statIntervalMs", 60_000);

        createProductAccessService();

        assertThat(DegradeRuleManager.getRules())
                .singleElement()
                .extracting(rule -> rule.getStatIntervalMs())
                .isEqualTo(60_000);
    }

    @Test
    void rejectsStockDeductionWhenProductReturnsBusinessError() {
        configureCircuitBreaker(20, 1);
        StockOperationRequest request = new StockOperationRequest("order-1", 1L, 1);
        when(productFeignClient.deductStock(request))
                .thenReturn(ApiResponse.error(ErrorCode.STOCK_INSUFFICIENT, "库存不足"));
        ProductAccessService productAccessService = createProductAccessService();

        assertThatThrownBy(() -> productAccessService.deductStock(request))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getCode())
                .isEqualTo(ErrorCode.STOCK_INSUFFICIENT);
    }

    private void configureCircuitBreaker(int slowCallRtMs, int minRequestAmount) {
        ReflectionTestUtils.setField(resilienceConfig, "slowRatioThreshold", 0.5D);
        ReflectionTestUtils.setField(resilienceConfig, "slowCallRtMs", slowCallRtMs);
        ReflectionTestUtils.setField(resilienceConfig, "minRequestAmount", minRequestAmount);
        ReflectionTestUtils.setField(resilienceConfig, "statIntervalMs", 60_000);
        ReflectionTestUtils.setField(resilienceConfig, "timeWindowSeconds", 10);
    }

    private ProductAccessService createProductAccessService() {
        ProductAccessService service = new ProductAccessService(productFeignClient, resilienceConfig);
        service.initializeCircuitBreakerRules();
        return service;
    }
}
