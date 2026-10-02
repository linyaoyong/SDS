package com.campus.trade.message.service;

import com.campus.trade.message.dto.ConversationResponse;
import com.campus.trade.common.dto.ApiResponse;
import java.util.List;

public interface ConversationService {
    ApiResponse<List<ConversationResponse>> getConversations(Long userId);
    ApiResponse<Integer> getUnreadCount(Long userId);
    ApiResponse<Void> markRead(Long productId, Long otherUserId, Long userId);
}
