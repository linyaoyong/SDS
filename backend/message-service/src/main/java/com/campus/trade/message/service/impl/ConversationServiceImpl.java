package com.campus.trade.message.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.message.dto.ConversationResponse;
import com.campus.trade.message.entity.Conversation;
import com.campus.trade.message.feign.AuthFeignClient;
import com.campus.trade.message.feign.ProductFeignClient;
import com.campus.trade.message.mapper.ConversationMapper;
import com.campus.trade.message.mapper.MessageMapper;
import com.campus.trade.message.service.ConversationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {

    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final AuthFeignClient authFeignClient;
    private final ProductFeignClient productFeignClient;

    @Override
    public ApiResponse<List<ConversationResponse>> getConversations(Long userId) {
        LambdaQueryWrapper<Conversation> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.and(w -> w.eq(Conversation::getUserAId, userId)
                        .or().eq(Conversation::getUserBId, userId))
                .orderByDesc(Conversation::getUpdatedAt);

        List<Conversation> conversations = conversationMapper.selectList(queryWrapper);

        List<ConversationResponse> responses = conversations.stream()
                .map(conv -> buildConversationResponse(conv, userId))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        return ApiResponse.success(responses);
    }

    @Override
    public ApiResponse<Integer> getUnreadCount(Long userId) {
        LambdaQueryWrapper<Conversation> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.and(w -> w.eq(Conversation::getUserAId, userId)
                .or().eq(Conversation::getUserBId, userId));

        List<Conversation> conversations = conversationMapper.selectList(queryWrapper);

        int totalUnread = conversations.stream()
                .mapToInt(conv -> {
                    if (userId.equals(conv.getUserAId())) {
                        return conv.getUserAUnreadCount() != null ? conv.getUserAUnreadCount() : 0;
                    } else {
                        return conv.getUserBUnreadCount() != null ? conv.getUserBUnreadCount() : 0;
                    }
                })
                .sum();

        return ApiResponse.success(totalUnread);
    }

    @Override
    @Transactional
    public ApiResponse<Void> markRead(Long productId, Long otherUserId, Long userId) {
        messageMapper.markRead(productId, userId, otherUserId);

        // Reset unread count in conversation
        Long userA = Math.min(userId, otherUserId);
        Long userB = Math.max(userId, otherUserId);

        LambdaUpdateWrapper<Conversation> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(Conversation::getProductId, productId)
                .eq(Conversation::getUserAId, userA)
                .eq(Conversation::getUserBId, userB);

        if (userId.equals(userA)) {
            updateWrapper.set(Conversation::getUserAUnreadCount, 0);
        } else {
            updateWrapper.set(Conversation::getUserBUnreadCount, 0);
        }

        conversationMapper.update(null, updateWrapper);
        return ApiResponse.success(null);
    }

    private ConversationResponse buildConversationResponse(Conversation conv, Long userId) {
        try {
            Long otherUserId = conv.getUserAId().equals(userId) ? conv.getUserBId() : conv.getUserAId();
            int unreadCount;
            if (userId.equals(conv.getUserAId())) {
                unreadCount = conv.getUserAUnreadCount() != null ? conv.getUserAUnreadCount() : 0;
            } else {
                unreadCount = conv.getUserBUnreadCount() != null ? conv.getUserBUnreadCount() : 0;
            }

            // Fetch other user info
            Map<String, Object> otherUser = fetchUser(otherUserId);
            // Fetch product info
            Map<String, Object> product = fetchProduct(conv.getProductId());

            // Build last message map
            Map<String, Object> lastMessage = new HashMap<>();
            lastMessage.put("content", conv.getLastMessageContent());
            lastMessage.put("createdAt", conv.getLastMessageAt());

            return ConversationResponse.builder()
                    .otherUser(otherUser)
                    .product(product)
                    .unreadCount(unreadCount)
                    .lastMessage(lastMessage)
                    .updatedAt(conv.getUpdatedAt())
                    .build();
        } catch (Exception e) {
            log.warn("Failed to build conversation response for conversation productId={}", conv.getProductId(), e);
            return null;
        }
    }

    private Map<String, Object> fetchUser(Long userId) {
        try {
            ApiResponse<Map<String, Object>> resp = authFeignClient.getUser(userId);
            if (resp != null && resp.getData() != null) {
                Map<String, Object> data = resp.getData();
                Map<String, Object> result = new HashMap<>();
                result.put("id", data.get("id"));
                result.put("username", data.get("username"));
                result.put("name", data.getOrDefault("name", data.get("username")));
                result.put("avatar", data.getOrDefault("avatarUrl", ""));
                return result;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch user info for {}", userId, e);
        }
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("id", userId);
        fallback.put("username", "未知用户");
        return fallback;
    }

    private Map<String, Object> fetchProduct(Long productId) {
        try {
            ApiResponse<Map<String, Object>> resp = productFeignClient.getProductInfo(productId);
            if (resp != null && resp.getData() != null) {
                return resp.getData();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch product info for {}", productId, e);
        }
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("id", productId);
        fallback.put("title", "未知商品");
        return fallback;
    }
}
