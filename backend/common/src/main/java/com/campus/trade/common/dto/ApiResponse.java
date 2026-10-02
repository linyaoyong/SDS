package com.campus.trade.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private int code;
    private String message;
    private T data;
    // Pagination fields (for PageResult wrapping)
    private Long total;
    private Integer page;
    private Integer size;

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(200, "success", data, null, null, null);
    }

    public static <T> ApiResponse<T> success(T data, long total, int page, int size) {
        return new ApiResponse<>(200, "success", data, total, page, size);
    }

    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, null, null, null, null);
    }
}
