package com.campus.trade.product.config;

import com.alibaba.csp.sentinel.adapter.spring.webmvc.callback.BlockExceptionHandler;
import com.campus.trade.common.dto.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;

import java.nio.charset.StandardCharsets;

@Configuration
public class ProductSentinelBlockHandlerConfig {

    @Bean
    BlockExceptionHandler productListBlockExceptionHandler(ObjectMapper objectMapper) {
        return (HttpServletRequest request, HttpServletResponse response, com.alibaba.csp.sentinel.slots.block.BlockException exception) -> {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), ApiResponse.error(42901, "访问过于频繁，请稍后再试"));
        };
    }
}
