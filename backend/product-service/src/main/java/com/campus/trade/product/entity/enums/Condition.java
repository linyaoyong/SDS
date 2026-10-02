package com.campus.trade.product.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum Condition {
    BRAND_NEW(10, "全新"),
    LIKE_NEW(9, "99新"),
    ALMOST_NEW(8, "95新"),
    NINETY_PCT(7, "9成新"),
    EIGHTY_FIVE_PCT(6, "85新"),
    EIGHTY_PCT(5, "8成新"),
    SEVENTY_PCT(4, "7成新"),
    SIXTY_PCT(3, "6成新"),
    FIFTY_PCT(2, "5成新"),
    TEN_PCT(1, "1成新");

    @EnumValue
    @JsonValue
    private final int value;
    private final String label;

    Condition(int value, String label) {
        this.value = value;
        this.label = label;
    }

    @JsonCreator
    public static Condition fromValue(int value) {
        for (Condition c : values()) {
            if (c.value == value) return c;
        }
        return EIGHTY_PCT; // default fallback
    }
}
