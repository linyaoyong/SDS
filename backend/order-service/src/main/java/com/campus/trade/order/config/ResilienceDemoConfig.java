package com.campus.trade.order.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Component;

/**
 * Nacos-managed settings used for the local Sentinel circuit-breaker demo.
 * The delay is disabled by default and must never affect normal traffic.
 */
@Component
@RefreshScope
@Getter
public class ResilienceDemoConfig {

    @Value("${resilience.demo.product-delay-ms:0}")
    private int productDelayMs;

    @Value("${resilience.circuit-breaker.slow-ratio-threshold:0.5}")
    private double slowRatioThreshold;

    @Value("${resilience.circuit-breaker.slow-call-rt-ms:1000}")
    private int slowCallRtMs;

    @Value("${resilience.circuit-breaker.min-request-amount:5}")
    private int minRequestAmount;

    @Value("${resilience.circuit-breaker.stat-interval-ms:60000}")
    private int statIntervalMs;

    @Value("${resilience.circuit-breaker.time-window-seconds:10}")
    private int timeWindowSeconds;
}
