package com.campus.trade.auth.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class UserPublicResponse {
    private Long id;
    private String username;
    private String name;
    private String avatarUrl;
    private String school;
    private BigDecimal creditScore;
    private Boolean deleted;
}
