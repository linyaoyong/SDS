package com.campus.trade.common.config;

import com.campus.trade.common.feign.InternalTokenInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FeignConfig {
    @Bean
    public InternalTokenInterceptor internalTokenInterceptor() {
        return new InternalTokenInterceptor();
    }
}
