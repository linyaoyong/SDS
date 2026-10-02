package com.campus.trade.auth.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import lombok.Getter;

@Getter
public enum UserRole {
    STUDENT(0, "学生"),
    ADMIN(1, "管理员"),
    SUPER_ADMIN(2, "超级管理员");

    @EnumValue
    private final int value;
    private final String label;

    UserRole(int value, String label) {
        this.value = value;
        this.label = label;
    }
}
