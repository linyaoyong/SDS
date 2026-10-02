package com.campus.trade.product.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Component;

/**
 * Nacos 配置热刷新演示
 * 配置项 hot.products.limit 存储在 Nacos Config 中
 * 修改 Nacos 配置后，无需重启服务即可生效
 */
@Component
@RefreshScope
@Getter
public class HotProductConfig {

    /**
     * 首页热门商品展示数量上限
     * 默认值: 6
     * Nacos 中修改此配置后自动生效
     */
    @Value("${hot.products.limit:6}")
    private int hotProductsLimit;

    /**
     * 搜索最大分页大小
     * 默认值: 100
     */
    @Value("${product.search.max-page-size:100}")
    private int maxPageSize;

    /**
     * 商品列表默认排序字段
     * 默认值: createdAt
     */
    @Value("${product.search.default-sort:createdAt}")
    private String defaultSort;

    /** Product-list QPS threshold, persisted in product-service.yaml. */
    @Value("${sentinel.product-list.qps:20}")
    private double productListQps;
}
