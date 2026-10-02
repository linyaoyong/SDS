package com.campus.trade.common.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditScoreUpdateRequest {
    private BigDecimal score;
    private String changeReason;
}
