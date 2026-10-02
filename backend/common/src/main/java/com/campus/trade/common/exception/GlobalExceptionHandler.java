package com.campus.trade.common.exception;

import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BlockException.class)
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    public ApiResponse<Void> handleBlock(BlockException e) {
        log.warn("Sentinel blocked request: {}", e.getRuleLimitApp());
        return ApiResponse.error(42901, "访问过于频繁，请稍后再试");
    }

    @ExceptionHandler(BusinessException.class)
    public ApiResponse<Void> handleBusinessException(BusinessException e) {
        log.warn("Business exception: code={}, message={}", e.getCode(), e.getMessage());
        return ApiResponse.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleValidation(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
        return ApiResponse.error(ErrorCode.VALIDATION_FAILED, msg);
    }

    /**
     * Database integrity violations: data too long, unique constraint, etc.
     * Without validation starter these trip before Bean Validation can reject them.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleDataIntegrity(DataIntegrityViolationException e) {
        log.warn("Data integrity violation", e);
        // Extract the most useful part of the message
        Throwable cause = e.getMostSpecificCause();
        String detail = cause != null ? cause.getMessage() : e.getMessage();
        // Truncate the verbose MySQL message to something readable
        if (detail != null && detail.contains("Data too long")) {
            detail = detail.replaceAll("Data too long for column '([^']+)'.*", "字段 '$1' 数据过长");
        }
        return ApiResponse.error(ErrorCode.VALIDATION_FAILED, detail);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleNotReadable(HttpMessageNotReadableException e) {
        log.warn("Malformed request body: {}", e.getMessage());
        return ApiResponse.error(ErrorCode.VALIDATION_FAILED, "请求体格式不正确");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleException(Exception e) {
        log.error("Unexpected error", e);
        return ApiResponse.error(ErrorCode.INTERNAL_ERROR, "服务器内部错误");
    }
}
