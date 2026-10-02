package com.campus.trade.order.service;

import com.campus.trade.order.dto.PageResult;
import com.campus.trade.order.dto.ReviewRequest;
import com.campus.trade.order.dto.ReviewResponse;

import java.util.List;

public interface ReviewService {

    ReviewResponse createReview(Long orderId, ReviewRequest request, Long userId);

    PageResult<ReviewResponse> getReviewsByProduct(Long productId, Integer page, Integer size);

    List<ReviewResponse> getReviewHistory(Long orderId);
}
