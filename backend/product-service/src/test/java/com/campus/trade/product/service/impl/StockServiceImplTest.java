package com.campus.trade.product.service.impl;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.StockOperationRequest;
import com.campus.trade.common.exception.BusinessException;
import com.campus.trade.product.entity.Product;
import com.campus.trade.product.entity.StockOperationRecord;
import com.campus.trade.product.entity.enums.ProductStatus;
import com.campus.trade.product.mapper.ProductMapper;
import com.campus.trade.product.mapper.StockOperationRecordMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class StockServiceImplTest {

    private ProductMapper productMapper;
    private StockOperationRecordMapper stockRecordMapper;
    private StockServiceImpl service;

    @BeforeEach
    void setUp() {
        productMapper = mock(ProductMapper.class);
        stockRecordMapper = mock(StockOperationRecordMapper.class);
        service = new StockServiceImpl(productMapper, stockRecordMapper);
        when(stockRecordMapper.selectCount(any(Wrapper.class))).thenReturn(0L);
    }

    @Test
    void retriesWithFreshVersionAfterOneConflict() {
        when(productMapper.selectById(9L)).thenReturn(product(9L, 10, 3), product(9L, 10, 4));
        when(productMapper.updateStock(9L, 9, 3)).thenReturn(0);
        when(productMapper.updateStock(9L, 9, 4)).thenReturn(1);

        service.deduct(new StockOperationRequest("order-1", 9L, 1));

        verify(productMapper).updateStock(9L, 9, 3);
        verify(productMapper).updateStock(9L, 9, 4);
        verify(stockRecordMapper).insert(any(StockOperationRecord.class));
    }

    @Test
    void rejectsWhenFreshReadShowsNoRemainingStock() {
        when(productMapper.selectById(9L)).thenReturn(product(9L, 10, 3), product(9L, 0, 4));
        when(productMapper.updateStock(9L, 9, 3)).thenReturn(0);

        assertThatThrownBy(() -> service.deduct(new StockOperationRequest("order-2", 9L, 1)))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getCode())
                .isEqualTo(ErrorCode.STOCK_INSUFFICIENT);
    }

    @Test
    void retriesPastTwelveConflictsBeforeSucceeding() {
        when(productMapper.selectById(9L)).thenAnswer(invocation -> product(9L, 10, 3));
        when(productMapper.updateStock(eq(9L), eq(9), eq(3))).thenReturn(
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);

        service.deduct(new StockOperationRequest("order-3", 9L, 1));

        verify(productMapper, org.mockito.Mockito.times(13)).updateStock(9L, 9, 3);
    }

    @Test
    void returnsImmediatelyForAnAlreadyProcessedOrder() {
        when(stockRecordMapper.selectCount(any(Wrapper.class))).thenReturn(1L);

        service.deduct(new StockOperationRequest("order-4", 9L, 1));

        verify(stockRecordMapper, never()).insert(any(StockOperationRecord.class));
        verifyNoInteractions(productMapper);
    }

    private Product product(Long id, int stockQuantity, int version) {
        Product product = new Product();
        product.setId(id);
        product.setStockQuantity(stockQuantity);
        product.setVersion(version);
        product.setStatus(ProductStatus.LISTED);
        return product;
    }
}
