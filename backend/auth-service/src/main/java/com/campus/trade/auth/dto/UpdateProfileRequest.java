package com.campus.trade.auth.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    // 允许空字符串（表示不更新该字段）；非空时须为 3-20 位字母/数字/下划线
    @Pattern(regexp = "^$|^[a-zA-Z0-9_]{3,20}$", message = "用户名须为3-20位字母/数字/下划线")
    private String username;

    // 允许空字符串（表示不更新该字段）；非空时须为合法手机号
    @Pattern(regexp = "^$|^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    private String name;
    private String school;
    private String college;
    private String major;
    private String grade;
    private Integer gender;
}
