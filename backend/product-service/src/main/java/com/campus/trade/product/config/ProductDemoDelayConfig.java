package com.campus.trade.product.config;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Component;

/**
 * A deliberately opt-in delay for exercising the order-service circuit breaker
 * against internal product APIs. It is disabled by default.
 */
@Slf4j
@Component
@RefreshScope
@Getter
public class ProductDemoDelayConfig {

    @Value("${resilience.demo.product-delay-ms:0}")
    private int productDelayMs;

    public void delayIfConfigured() {
        if (productDelayMs <= 0) {
            return;
        }
        log.warn("Applying {} ms demo delay to an internal product API request", productDelayMs);
        try {
            Thread.sleep(productDelayMs);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
