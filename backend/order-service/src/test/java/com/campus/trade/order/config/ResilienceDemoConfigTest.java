package com.campus.trade.order.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "resilience.circuit-breaker.slow-ratio-threshold=0.75",
        "resilience.circuit-breaker.slow-call-rt-ms=1200",
        "resilience.circuit-breaker.min-request-amount=8",
        "resilience.circuit-breaker.stat-interval-ms=30000",
        "resilience.circuit-breaker.time-window-seconds=15"
})
class ResilienceDemoConfigTest {

    @Autowired
    private ResilienceDemoConfig config;

    @Test
    void bindsCircuitBreakerSettingsAndKeepsDelayDisabledByDefault() {
        assertThat(config.getProductDelayMs()).isZero();
        assertThat(config.getSlowRatioThreshold()).isEqualTo(0.75);
        assertThat(config.getSlowCallRtMs()).isEqualTo(1200);
        assertThat(config.getMinRequestAmount()).isEqualTo(8);
        assertThat(config.getStatIntervalMs()).isEqualTo(30000);
        assertThat(config.getTimeWindowSeconds()).isEqualTo(15);
    }
}
