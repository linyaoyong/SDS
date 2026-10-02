package com.campus.trade.auth.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class UserProfileResponse {
    private Long id;
    private String username;
    private String phone;
    private String email;
    private String studentId;
    private String name;
    private String school;
    private String college;
    private String major;
    private String grade;
    private Integer gender;
    private String avatarUrl;
    private BigDecimal creditScore;
}
