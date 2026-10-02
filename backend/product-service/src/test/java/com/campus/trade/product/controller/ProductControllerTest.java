package com.campus.trade.product.controller;

import com.campus.trade.product.config.HotProductConfig;
import com.campus.trade.product.feign.OrderFeignClient;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.campus.trade.product.service.ProductService;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ProductControllerTest {

    @Test
    void capsRequestedPageSizeUsingRefreshedConfiguration() {
        ProductService productService = mock(ProductService.class);
        HotProductConfig config = new HotProductConfig();
        ReflectionTestUtils.setField(config, "maxPageSize", 3);
        ReflectionTestUtils.setField(config, "defaultSort", "price");
        ProductController controller = new ProductController(productService, mock(OrderFeignClient.class), config);

        controller.list(null, null, false, 1, 20, null, null);

        verify(productService).listProducts(null, null, false, 1, 3, "price", null);
    }

    @Test
    void logsTheInstancePortThatHandledTheProductListRequest() {
        ProductService productService = mock(ProductService.class);
        HotProductConfig config = new HotProductConfig();
        ReflectionTestUtils.setField(config, "maxPageSize", 20);
        ReflectionTestUtils.setField(config, "defaultSort", "createdAt");
        ProductController controller = new ProductController(productService, mock(OrderFeignClient.class), config);
        ReflectionTestUtils.setField(controller, "localServerPort", 9082);

        Logger logger = (Logger) LoggerFactory.getLogger(ProductController.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            controller.list(null, null, null, 1, 1, null, null);

            assertThat(appender.list)
                    .extracting(ILoggingEvent::getFormattedMessage)
                    .contains("[LoadBalancer] product-service:9082 handled GET /api/products?page=1&size=1");
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
