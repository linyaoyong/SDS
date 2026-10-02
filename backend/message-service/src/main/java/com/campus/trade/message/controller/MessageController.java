package com.campus.trade.message.controller;

import com.campus.trade.message.dto.*;
import com.campus.trade.message.service.ConversationService;
import com.campus.trade.message.service.MessageService;
import com.campus.trade.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final ConversationService conversationService;

    // ========== Conversation APIs ==========

    @GetMapping("/conversations")
    public ApiResponse<List<ConversationResponse>> getConversations(
            @RequestHeader("X-User-Id") Long userId) {
        return conversationService.getConversations(userId);
    }

    @GetMapping("/conversations/{productId}")
    public ApiResponse<List<MessageResponse>> getMessages(
            @PathVariable Long productId,
            @RequestParam Long otherUserId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return messageService.getMessages(productId, otherUserId, userId, page, size);
    }

    @PutMapping("/conversations/read")
    public ApiResponse<Void> markRead(
            @RequestParam Long productId,
            @RequestParam Long otherUserId,
            @RequestHeader("X-User-Id") Long userId) {
        return conversationService.markRead(productId, otherUserId, userId);
    }

    @GetMapping("/unread-count")
    public ApiResponse<Integer> getUnreadCount(
            @RequestHeader("X-User-Id") Long userId) {
        return conversationService.getUnreadCount(userId);
    }

    // ========== Message APIs ==========

    @PostMapping
    public ApiResponse<MessageResponse> sendMessage(
            @Valid @RequestBody SendMessageRequest request,
            @RequestHeader("X-User-Id") Long userId) {
        return messageService.sendMessage(request, userId);
    }
}
