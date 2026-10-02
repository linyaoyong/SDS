package com.campus.trade.product.dto;

import com.campus.trade.product.entity.enums.Condition;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class ProductRequest {
    @NotBlank @Size(max = 200)
    private String title;
    private String description;
    @NotNull @DecimalMin("0.00") @DecimalMax("99999.99")
    private BigDecimal price;
    private BigDecimal originalPrice;
    @NotNull
    private Long categoryId;
    private Integer stockQuantity = 1;
    private Condition condition = Condition.EIGHTY_PCT;
    private String location;
    private List<String> tags;
}
