package com.campus.trade.product.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.campus.trade.product.entity.Product;
import com.campus.trade.product.entity.StockOperationRecord;
import com.campus.trade.product.entity.enums.ProductStatus;
import com.campus.trade.product.mapper.ProductMapper;
import com.campus.trade.product.mapper.StockOperationRecordMapper;
import com.campus.trade.product.service.StockService;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.dto.StockOperationRequest;
import com.campus.trade.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockServiceImpl implements StockService {

    private static final int MAX_STOCK_UPDATE_ATTEMPTS = 50;

    private final ProductMapper productMapper;
    private final StockOperationRecordMapper stockRecordMapper;

    @Override
    @Transactional
    public ApiResponse<Void> deduct(StockOperationRequest request) {
        // 1. Check idempotency
        if (hasRecord(request.getOrderNo(), "DEDUCT")) {
            log.info("DEDUCT already processed for order {}", request.getOrderNo());
            return ApiResponse.success(null);
        }

        // 2. Validate product before creating an idempotency record.
        Product product = loadDeductibleProduct(request);

        // 3. Insert idempotency record (unique key protects against concurrent dupes)
        StockOperationRecord record = new StockOperationRecord();
        record.setOrderNo(request.getOrderNo());
        record.setProductId(request.getProductId());
        record.setQuantity(request.getQuantity());
        record.setOperationType("DEDUCT");
        stockRecordMapper.insert(record);

        // 4. Retry only optimistic-lock conflicts with a freshly read version.
        for (int attempt = 1; attempt <= MAX_STOCK_UPDATE_ATTEMPTS; attempt++) {
            int newQuantity = product.getStockQuantity() - request.getQuantity();
            int updated = productMapper.updateStock(product.getId(), newQuantity, product.getVersion());
            if (updated == 0) {
                if (attempt < MAX_STOCK_UPDATE_ATTEMPTS) {
                    product = loadDeductibleProduct(request);
                }
                continue;
            }

            // 5. If stock becomes 0, mark SOLD
            if (newQuantity == 0) {
                productMapper.updateStatus(product.getId(), ProductStatus.SOLD.getValue(), product.getVersion() + 1);
            }

            log.info("DEDUCT success: order={}, product={}, qty={}, remaining={}",
                    request.getOrderNo(), product.getId(), request.getQuantity(), newQuantity);
            return ApiResponse.success(null);
        }

        throw new BusinessException(ErrorCode.CONFLICT_RETRY, "操作冲突请刷新重试");
    }

    @Override
    @Transactional
    public ApiResponse<Void> restore(StockOperationRequest request) {
        // 1. Check idempotency
        if (hasRecord(request.getOrderNo(), "RESTORE")) {
            log.info("RESTORE already processed for order {}", request.getOrderNo());
            return ApiResponse.success(null);
        }

        // 2. Check DEDUCT record exists
        if (!hasRecord(request.getOrderNo(), "DEDUCT")) {
            log.warn("RESTORE called but no DEDUCT record exists for order {}", request.getOrderNo());
            return ApiResponse.success(null); // Never deducted, nothing to restore
        }

        // 3. Insert RESTORE record
        StockOperationRecord record = new StockOperationRecord();
        record.setOrderNo(request.getOrderNo());
        record.setProductId(request.getProductId());
        record.setQuantity(request.getQuantity());
        record.setOperationType("RESTORE");
        stockRecordMapper.insert(record);

        // 4. Restore stock with optimistic lock
        Product product = productMapper.selectById(request.getProductId());
        int newQuantity = product.getStockQuantity() + request.getQuantity();
        int updated = productMapper.updateStock(product.getId(), newQuantity, product.getVersion());
        if (updated == 0) {
            throw new BusinessException(ErrorCode.CONFLICT_RETRY, "操作冲突请刷新重试");
        }

        // 5. If was SOLD and now has stock and not OFF_SHELF, restore to LISTED
        if (product.getStatus() == ProductStatus.SOLD && newQuantity > 0) {
            productMapper.updateStatus(product.getId(), ProductStatus.LISTED.getValue(), product.getVersion() + 1);
        }

        log.info("RESTORE success: order={}, product={}, qty={}, newStock={}",
                request.getOrderNo(), request.getProductId(), request.getQuantity(), newQuantity);
        return ApiResponse.success(null);
    }

    private boolean hasRecord(String orderNo, String operationType) {
        return stockRecordMapper.selectCount(
                new LambdaQueryWrapper<StockOperationRecord>()
                        .eq(StockOperationRecord::getOrderNo, orderNo)
                        .eq(StockOperationRecord::getOperationType, operationType)) > 0;
    }

    private Product loadDeductibleProduct(StockOperationRequest request) {
        Product product = productMapper.selectById(request.getProductId());
        if (product == null) {
            throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
        }
        if (product.getStatus() != ProductStatus.LISTED) {
            throw new BusinessException(ErrorCode.PRODUCT_STATUS_INVALID, "商品已下架或状态不允许");
        }
        if (product.getStockQuantity() < request.getQuantity()) {
            throw new BusinessException(ErrorCode.STOCK_INSUFFICIENT, "库存不足");
        }
        return product;
    }

}
