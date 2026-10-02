package com.campus.trade.product.config;

import com.alibaba.csp.sentinel.slots.block.flow.FlowRule;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRuleManager;
import jakarta.annotation.PostConstruct;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.context.event.EventListener;

import java.lang.reflect.Method;
import static org.assertj.core.api.Assertions.assertThat;

class ProductSentinelRuleInitializerTest {

    @AfterEach
    void clearRules() {
        FlowRuleManager.loadRules(java.util.List.of());
    }

    @Test
    void loadsOnlyTheActualProductListResourceUsingConfiguredQps() {
        HotProductConfig config = new HotProductConfig();
        ReflectionTestUtils.setField(config, "productListQps", 7D);
        ProductSentinelRuleInitializer initializer = new ProductSentinelRuleInitializer(config);

        initializer.refreshRules();

        assertThat(FlowRuleManager.getRules())
                .extracting(FlowRule::getResource)
                .containsExactly(ProductSentinelRuleInitializer.PRODUCT_LIST_RESOURCE);
        assertThat(FlowRuleManager.getRules())
                .extracting(FlowRule::getCount)
                .containsExactly(7D);
    }

    @Test
    void initializesRulesOnlyAfterTheApplicationIsReady() throws Exception {
        Method method = ProductSentinelRuleInitializer.class
                .getDeclaredMethod("onApplicationReady", ApplicationReadyEvent.class);

        assertThat(method.getAnnotation(EventListener.class)).isNotNull();
        assertThat(ProductSentinelRuleInitializer.class.getDeclaredMethods())
                .noneMatch(candidate -> candidate.isAnnotationPresent(PostConstruct.class));
    }

}
