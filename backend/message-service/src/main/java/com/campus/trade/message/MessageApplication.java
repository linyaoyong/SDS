package com.campus.trade.message;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(scanBasePackages = {"com.campus.trade.message", "com.campus.trade.common"})
@EnableDiscoveryClient
@EnableFeignClients(basePackages = {"com.campus.trade.message.feign", "com.campus.trade.common.feign"})
@MapperScan("com.campus.trade.message.mapper")
public class MessageApplication {
    public static void main(String[] args) {
        SpringApplication.run(MessageApplication.class, args);
    }
}
