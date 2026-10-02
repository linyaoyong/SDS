package com.campus.trade.common.feign;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.beans.factory.annotation.Value;

public class InternalTokenInterceptor implements RequestInterceptor {

    @Value("${internal.token}")
    private String internalToken;

    @Override
    public void apply(RequestTemplate template) {
        template.header("X-Internal-Token", internalToken);
    }
}
