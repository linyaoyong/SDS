package com.campus.trade.order.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum OrderStatus {
    PENDING_PAYMENT(0, "待付款"),
    PAID(1, "已付款"),
    DELIVERED(2, "已发货"),
    COMPLETED(3, "已完成"),
    CANCELLED(4, "已取消"),
    CLOSED(5, "已关闭"),
    STOCK_DEDUCT_FAILED(6, "库存扣减失败");

    @EnumValue
    @JsonValue
    private final int value;
    private final String label;

    OrderStatus(int value, String label) {
        this.value = value;
        this.label = label;
    }

    @JsonCreator
    public static OrderStatus fromValue(int value) {
        for (OrderStatus s : values()) {
            if (s.value == value) return s;
        }
        return PENDING_PAYMENT;
    }
}
