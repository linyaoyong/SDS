package com.campus.trade.product.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "resilience.demo.product-delay-ms=25")
class ProductDemoDelayConfigTest {

    @Autowired
    private ProductDemoDelayConfig config;

    @Test
    void bindsInternalDemoDelayFromConfiguration() {
        assertThat(config.getProductDelayMs()).isEqualTo(25);
    }

    @Test
    void delaysOnlyByTheConfiguredDemoDuration() {
        long startedAt = System.nanoTime();

        config.delayIfConfigured();

        long elapsedMs = (System.nanoTime() - startedAt) / 1_000_000;
        assertThat(elapsedMs).isGreaterThanOrEqualTo(20);
    }
}
