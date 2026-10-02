package com.campus.trade.message.service;

import com.campus.trade.message.dto.*;
import com.campus.trade.common.dto.ApiResponse;
import java.util.List;

public interface MessageService {
    ApiResponse<MessageResponse> sendMessage(SendMessageRequest request, Long senderId);
    ApiResponse<List<MessageResponse>> getMessages(Long productId, Long otherUserId, Long userId, Integer page, Integer size);
    ApiResponse<Void> sendSystemMessage(SystemMessageRequest request);
}
