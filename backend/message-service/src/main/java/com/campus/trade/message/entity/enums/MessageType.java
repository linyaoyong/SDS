package com.campus.trade.message.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import lombok.Getter;

@Getter
public enum MessageType {
    TEXT("TEXT", "普通文本"),
    SYSTEM("SYSTEM", "系统通知");

    @EnumValue
    private final String value;
    private final String label;

    MessageType(String value, String label) {
        this.value = value;
        this.label = label;
    }
}
