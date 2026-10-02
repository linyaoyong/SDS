package com.campus.trade.product.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum ProductStatus {
    DRAFT(0, "草稿"),
    LISTED(1, "已上架"),
    SOLD(2, "已售出"),
    OFF_SHELF(3, "已下架");

    @EnumValue
    @JsonValue
    private final int value;
    private final String label;

    ProductStatus(int value, String label) {
        this.value = value;
        this.label = label;
    }

    @JsonCreator
    public static ProductStatus fromValue(int value) {
        for (ProductStatus s : values()) {
            if (s.value == value) return s;
        }
        return LISTED;
    }
}
