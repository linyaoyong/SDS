package com.campus.trade.message.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SendMessageRequest {
    @NotNull
    private Long receiverId;
    @NotNull
    private Long productId;
    @NotBlank @Size(max = 1000)
    private String content;
    private Long orderId;
}
