package com.campus.trade.order;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.campus.trade.order", "com.campus.trade.common"})
@EnableDiscoveryClient
@EnableFeignClients(basePackages = {"com.campus.trade.order.feign", "com.campus.trade.common.feign"})
@MapperScan("com.campus.trade.order.mapper")
@EnableScheduling
public class OrderApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderApplication.class, args);
    }
}
