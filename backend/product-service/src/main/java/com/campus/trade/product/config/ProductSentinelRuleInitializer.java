package com.campus.trade.product.config;

import com.alibaba.csp.sentinel.slots.block.RuleConstant;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRule;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRuleManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.cloud.context.environment.EnvironmentChangeEvent;
import org.springframework.cloud.context.scope.refresh.RefreshScopeRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProductSentinelRuleInitializer {

    public static final String PRODUCT_LIST_RESOURCE = "/api/products";

    private final HotProductConfig config;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady(ApplicationReadyEvent event) {
        refreshRules();
    }

    @EventListener(EnvironmentChangeEvent.class)
    public void onConfigurationChange(EnvironmentChangeEvent event) {
        if (event.getKeys().stream().anyMatch(key -> key.startsWith("sentinel.product-list."))) {
            refreshRules();
        }
    }

    @EventListener(RefreshScopeRefreshedEvent.class)
    public void onRefreshScopeRefreshed() {
        refreshRules();
    }

    public void refreshRules() {
        FlowRule rule = new FlowRule(PRODUCT_LIST_RESOURCE)
                .setGrade(RuleConstant.FLOW_GRADE_QPS)
                .setCount(config.getProductListQps());
        FlowRuleManager.loadRules(List.of(rule));
        log.info("Loaded product list Sentinel rule: resource={}, qps={}", PRODUCT_LIST_RESOURCE, config.getProductListQps());
    }
}
