package com.campus.trade.order.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.exception.BusinessException;
import com.campus.trade.order.dto.PageResult;
import com.campus.trade.order.dto.ReviewRequest;
import com.campus.trade.order.dto.ReviewResponse;
import com.campus.trade.order.entity.Order;
import com.campus.trade.order.entity.Review;
import com.campus.trade.order.entity.enums.OrderStatus;
import com.campus.trade.order.mapper.OrderMapper;
import com.campus.trade.order.mapper.ReviewMapper;
import com.campus.trade.order.service.ReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewMapper reviewMapper;
    private final OrderMapper orderMapper;

    @Override
    @Transactional
    public ReviewResponse createReview(Long orderId, ReviewRequest request, Long userId) {
        // Validate order exists
        Order order = orderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, "订单不存在");
        }

        // Only buyer can review
        if (!order.getBuyerId().equals(userId)) {
            throw new BusinessException(ErrorCode.NOT_BUYER_CANNOT_REVIEW, "只有买家可以评价");
        }

        // Only COMPLETED orders can be reviewed
        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.ONLY_COMPLETED_CAN_REVIEW, "只能对已完成的订单进行评价");
        }

        // Create review
        Review review = new Review();
        review.setOrderId(orderId);
        review.setProductId(order.getProductId());
        review.setReviewerId(userId);
        review.setReviewerName(order.getBuyerName());
        review.setReviewerAvatar(order.getBuyerAvatar());
        review.setRevieweeId(order.getSellerId());
        review.setRating(request.getRating());
        review.setContent(request.getContent());
        review.setStatus(1);
        reviewMapper.insert(review);

        return toResponse(review);
    }

    @Override
    public PageResult<ReviewResponse> getReviewsByProduct(Long productId, Integer page, Integer size) {
        if (page == null || page < 1) page = 1;
        if (size == null || size < 1) size = 20;
        if (size > 100) size = 100;

        LambdaQueryWrapper<Review> wrapper = new LambdaQueryWrapper<Review>()
                .eq(Review::getProductId, productId)
                .eq(Review::getStatus, 1)
                .orderByDesc(Review::getCreatedAt);

        Page<Review> reviewPage = new Page<>(page, size);
        reviewPage = reviewMapper.selectPage(reviewPage, wrapper);

        List<ReviewResponse> responses = reviewPage.getRecords().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return new PageResult<>(responses, reviewPage.getTotal(), page, size);
    }

    @Override
    public List<ReviewResponse> getReviewHistory(Long orderId) {
        List<Review> reviews = reviewMapper.selectList(
                new LambdaQueryWrapper<Review>()
                        .eq(Review::getOrderId, orderId)
                        .orderByDesc(Review::getCreatedAt));

        return reviews.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private ReviewResponse toResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .orderId(review.getOrderId())
                .productId(review.getProductId())
                .reviewerId(review.getReviewerId())
                .reviewerName(review.getReviewerName())
                .reviewerAvatar(review.getReviewerAvatar())
                .rating(review.getRating())
                .content(review.getContent())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
