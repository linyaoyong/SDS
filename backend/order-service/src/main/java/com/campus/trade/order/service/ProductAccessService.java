package com.campus.trade.order.service;

import com.alibaba.csp.sentinel.Entry;
import com.alibaba.csp.sentinel.SphU;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.alibaba.csp.sentinel.slots.block.RuleConstant;
import com.alibaba.csp.sentinel.slots.block.degrade.DegradeRule;
import com.alibaba.csp.sentinel.slots.block.degrade.DegradeRuleManager;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.dto.StockOperationRequest;
import com.campus.trade.common.exception.BusinessException;
import com.campus.trade.order.config.ResilienceDemoConfig;
import com.campus.trade.order.exception.InventoryServiceBusyException;
import com.campus.trade.order.feign.ProductFeignClient;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.context.environment.EnvironmentChangeEvent;
import org.springframework.cloud.context.scope.refresh.RefreshScopeRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * The only order-service boundary for product-service calls that participate in
 * the circuit-breaker demonstration.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductAccessService {

    public static final String PRODUCT_ACCESS_RESOURCE = "order:product-access";

    private final ProductFeignClient productFeignClient;
    private final ResilienceDemoConfig resilienceConfig;

    @PostConstruct
    public void initializeCircuitBreakerRules() {
        refreshCircuitBreakerRules();
    }

    @EventListener(EnvironmentChangeEvent.class)
    public void onEnvironmentChanged(EnvironmentChangeEvent event) {
        if (event.getKeys().stream().anyMatch(key -> key.startsWith("resilience.circuit-breaker."))) {
            refreshCircuitBreakerRules();
        }
    }

    @EventListener(RefreshScopeRefreshedEvent.class)
    public void onRefreshScopeRefreshed() {
        refreshCircuitBreakerRules();
    }

    public void refreshCircuitBreakerRules() {
        DegradeRule rule = new DegradeRule(PRODUCT_ACCESS_RESOURCE)
                .setGrade(RuleConstant.DEGRADE_GRADE_RT)
                .setCount(resilienceConfig.getSlowCallRtMs())
                .setSlowRatioThreshold(resilienceConfig.getSlowRatioThreshold())
                .setMinRequestAmount(resilienceConfig.getMinRequestAmount())
                .setTimeWindow(resilienceConfig.getTimeWindowSeconds())
                .setStatIntervalMs(resilienceConfig.getStatIntervalMs());
        DegradeRuleManager.loadRules(List.of(rule));
        log.info("Loaded product access circuit-breaker rule: resource={}, slowRtMs={}, ratio={}, minRequests={}, statIntervalMs={}, windowSeconds={}",
                PRODUCT_ACCESS_RESOURCE, resilienceConfig.getSlowCallRtMs(), resilienceConfig.getSlowRatioThreshold(),
                resilienceConfig.getMinRequestAmount(), resilienceConfig.getStatIntervalMs(), resilienceConfig.getTimeWindowSeconds());
    }

    public Map<String, Object> getProductInfo(Long productId) {
        return invoke(() -> productFeignClient.getProductInfo(productId).getData());
    }

    public void deductStock(StockOperationRequest request) {
        invoke(() -> {
            ApiResponse<Void> response = productFeignClient.deductStock(request);
            if (response == null || response.getCode() != 200) {
                int code = response == null ? 50000 : response.getCode();
                String message = response == null ? "库存服务返回空响应" : response.getMessage();
                throw new BusinessException(code, message);
            }
            return null;
        });
    }

    private <T> T invoke(ProductCall<T> call) {
        Entry entry = null;
        try {
            entry = SphU.entry(PRODUCT_ACCESS_RESOURCE);
            return call.execute();
        } catch (BlockException exception) {
            throw new InventoryServiceBusyException();
        } finally {
            if (entry != null) {
                entry.exit();
            }
        }
    }

    @FunctionalInterface
    private interface ProductCall<T> {
        T execute();
    }
}
