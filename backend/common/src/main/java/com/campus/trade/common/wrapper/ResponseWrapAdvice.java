package com.campus.trade.common.wrapper;

import com.campus.trade.common.dto.ApiResponse;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@RestControllerAdvice(basePackages = "com.campus.trade")
public class ResponseWrapAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class converterType) {
        // Skip if already ApiResponse
        if (returnType.getParameterType().equals(ApiResponse.class)) {
            return false;
        }
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType,
                                  MediaType selectedContentType, Class selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        // Skip Swagger resources
        String path = request.getURI().getPath();
        if (path.contains("/swagger-ui") || path.contains("/v3/api-docs")) {
            return body;
        }
        // Skip static resources
        if (path.startsWith("/static/")) return body;
        // Skip WebSocket
        if (path.startsWith("/ws/")) return body;
        // Wrap non-ApiResponse responses
        return ApiResponse.success(body);
    }
}
