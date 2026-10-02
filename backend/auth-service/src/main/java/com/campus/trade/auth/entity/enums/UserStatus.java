package com.campus.trade.auth.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import lombok.Getter;

@Getter
public enum UserStatus {
    NORMAL(0, "正常"),
    FROZEN(1, "冻结");

    @EnumValue
    private final int value;
    private final String label;

    UserStatus(int value, String label) {
        this.value = value;
        this.label = label;
    }
}
