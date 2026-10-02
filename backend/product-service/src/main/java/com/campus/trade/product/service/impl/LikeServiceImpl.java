package com.campus.trade.product.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.trade.product.dto.PageResult;
import com.campus.trade.product.dto.ProductResponse;
import com.campus.trade.product.entity.LikeRecord;
import com.campus.trade.product.entity.Product;
import com.campus.trade.product.mapper.LikeRecordMapper;
import com.campus.trade.product.mapper.ProductMapper;
import com.campus.trade.product.service.LikeService;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LikeServiceImpl implements LikeService {

    private final LikeRecordMapper likeRecordMapper;
    private final ProductMapper productMapper;

    @Override
    @Transactional
    public ApiResponse<Void> like(Long userId, Long productId) {
        Product product = productMapper.selectById(productId);
        if (product == null) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");

        LikeRecord existing = likeRecordMapper.selectOne(new LambdaQueryWrapper<LikeRecord>()
                .eq(LikeRecord::getUserId, userId)
                .eq(LikeRecord::getProductId, productId));

        if (existing != null) {
            if (existing.getStatus() == 1) {
                return ApiResponse.success(null); // Already liked, idempotent
            }
            existing.setStatus(1);
            likeRecordMapper.updateById(existing);
            // Increment like count atomically
            productMapper.incrementLikeCount(productId, 1);
        } else {
            LikeRecord record = new LikeRecord();
            record.setUserId(userId);
            record.setProductId(productId);
            record.setStatus(1);
            likeRecordMapper.insert(record);
            productMapper.incrementLikeCount(productId, 1);
        }
        return ApiResponse.success(null);
    }

    @Override
    @Transactional
    public ApiResponse<Void> unlike(Long userId, Long productId) {
        LikeRecord existing = likeRecordMapper.selectOne(new LambdaQueryWrapper<LikeRecord>()
                .eq(LikeRecord::getUserId, userId)
                .eq(LikeRecord::getProductId, productId));

        if (existing != null && existing.getStatus() == 1) {
            existing.setStatus(0);
            likeRecordMapper.updateById(existing);
            productMapper.incrementLikeCount(productId, -1);
        }
        // Idempotent: no error if not liked
        return ApiResponse.success(null);
    }

    @Override
    public ApiResponse<PageResult<ProductResponse>> listMyLikes(Long userId, Integer page, Integer size) {
        Page<LikeRecord> likePage = new Page<>(page, size);
        LambdaQueryWrapper<LikeRecord> wrapper = new LambdaQueryWrapper<LikeRecord>()
                .eq(LikeRecord::getUserId, userId)
                .eq(LikeRecord::getStatus, 1)
                .orderByDesc(LikeRecord::getCreatedAt);

        likePage = likeRecordMapper.selectPage(likePage, wrapper);

        List<ProductResponse> products = likePage.getRecords().stream()
                .map(lr -> {
                    Product p = productMapper.selectById(lr.getProductId());
                    if (p == null) return null;
                    return ProductResponse.builder()
                            .id(p.getId()).title(p.getTitle()).price(p.getPrice())
                            .images(p.getImages()).likeCount(p.getLikeCount())
                            .status(p.getStatus() != null ? p.getStatus().getValue() : null)
                            .createdAt(p.getCreatedAt()).build();
                })
                .filter(p -> p != null)
                .collect(Collectors.toList());

        return ApiResponse.success(new PageResult<>(products, likePage.getTotal(), page, size));
    }
}
