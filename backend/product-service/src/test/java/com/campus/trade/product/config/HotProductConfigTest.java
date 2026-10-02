package com.campus.trade.product.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "product.search.max-page-size=3",
        "product.search.default-sort=price"
})
class HotProductConfigTest {

    @Autowired
    private HotProductConfig config;

    @Test
    void bindsDynamicListSettings() {
        assertThat(config.getMaxPageSize()).isEqualTo(3);
        assertThat(config.getDefaultSort()).isEqualTo("price");
    }
}
