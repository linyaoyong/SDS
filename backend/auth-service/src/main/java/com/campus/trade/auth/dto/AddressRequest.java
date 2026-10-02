package com.campus.trade.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AddressRequest {
    @NotBlank(message = "收件人姓名不能为空")
    private String receiverName;

    @NotBlank(message = "收件人电话不能为空")
    private String receiverPhone;

    private String province;
    private String city;
    private String district;
    private String detail;
    private String postalCode;
    private Boolean isDefault = false;
    private String tag;
}
