package com.campus.trade.gateway.config;

import com.alibaba.csp.sentinel.slots.block.RuleConstant;
import com.alibaba.csp.sentinel.slots.block.degrade.DegradeRule;
import com.alibaba.csp.sentinel.slots.block.degrade.DegradeRuleManager;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRule;
import com.alibaba.csp.sentinel.slots.block.flow.FlowRuleManager;
import com.alibaba.csp.sentinel.slots.block.flow.param.ParamFlowRule;
import com.alibaba.csp.sentinel.slots.block.flow.param.ParamFlowRuleManager;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;

import java.util.Collections;

@Slf4j
@Configuration
public class SentinelRuleInitializer {

    @PostConstruct
    public void initRules() {
        initFlowRules();
        initDegradeRules();
        initParamFlowRules();
        log.info("Sentinel rules initialized successfully");
    }

    private void initFlowRules() {
        // Gateway: /api/products QPS limit 50
        FlowRule rule = new FlowRule();
        rule.setResource("gateway:/api/products");
        rule.setGrade(RuleConstant.FLOW_GRADE_QPS);
        rule.setCount(50);
        FlowRuleManager.loadRules(Collections.singletonList(rule));
        log.info("Flow rules loaded: /api/products QPS=50");
    }

    private void initDegradeRules() {
        // order-service Feign call to product-service: slow call ratio >50% triggers circuit break
        DegradeRule rule = new DegradeRule();
        rule.setResource("POST:http://product-service/internal/stock/deduct");
        rule.setGrade(RuleConstant.DEGRADE_GRADE_RT);
        rule.setCount(3000); // 3 seconds
        rule.setTimeWindow(10); // 10s recovery
        rule.setMinRequestAmount(5);
        rule.setSlowRatioThreshold(0.5);
        DegradeRuleManager.loadRules(Collections.singletonList(rule));
        log.info("Degrade rules loaded: product-service stock/deduct slowRatio>50%");
    }

    private void initParamFlowRules() {
        // Create order: max 10 requests per second per user
        ParamFlowRule rule = new ParamFlowRule();
        rule.setResource("POST:/api/orders");
        rule.setGrade(RuleConstant.FLOW_GRADE_QPS);
        rule.setCount(10);
        rule.setParamIdx(0); // userId
        ParamFlowRuleManager.loadRules(Collections.singletonList(rule));
        log.info("Param flow rules loaded: create order 10/sec per user");
    }
}
