package com.campus.trade.auth.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.campus.trade.auth.entity.enums.UserRole;
import com.campus.trade.auth.entity.enums.UserStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("users")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String username;
    private String password;
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
    private UserRole role;
    private UserStatus status;
    private BigDecimal creditScore;
    private String openid;
    private String unionid;
    private LocalDateTime lastLoginAt;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
    @Version
    private Integer version;
}
