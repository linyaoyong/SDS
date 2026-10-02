package com.campus.trade.message.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
import com.campus.trade.message.dto.*;
import com.campus.trade.message.entity.Conversation;
import com.campus.trade.message.entity.Message;
import com.campus.trade.message.entity.enums.MessageType;
import com.campus.trade.message.feign.AuthFeignClient;
import com.campus.trade.message.mapper.ConversationMapper;
import com.campus.trade.message.mapper.MessageMapper;
import com.campus.trade.message.service.MessageService;
import com.campus.trade.message.websocket.SessionManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final MessageMapper messageMapper;
    private final ConversationMapper conversationMapper;
    private final AuthFeignClient authFeignClient;
    private final SessionManager sessionManager;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public ApiResponse<MessageResponse> sendMessage(SendMessageRequest request, Long senderId) {
        if (senderId.equals(request.getReceiverId())) {
            throw new BusinessException(ErrorCode.CANNOT_CHAT_SELF, "不能给自己发消息");
        }

        // Build message entity
        Message message = new Message();
        message.setSenderId(senderId);
        message.setReceiverId(request.getReceiverId());
        message.setRelatedId(request.getProductId());
        message.setRelatedType("PRODUCT");
        message.setOrderId(request.getOrderId());
        message.setMessageType(MessageType.TEXT);
        message.setContent(request.getContent());
        message.setIsRead(0);
        message.setIsDeletedBySender(0);
        message.setIsDeletedByReceiver(0);

        // Fetch receiver info
        try {
            ApiResponse<Map<String, Object>> receiverResp = authFeignClient.getUser(request.getReceiverId());
            if (receiverResp != null && receiverResp.getData() != null) {
                Map<String, Object> receiverData = receiverResp.getData();
                message.setReceiverName(String.valueOf(receiverData.getOrDefault("name", receiverData.getOrDefault("username", ""))));
                message.setReceiverAvatar(String.valueOf(receiverData.getOrDefault("avatarUrl", "")));
            }
        } catch (Exception e) {
            log.warn("Failed to fetch receiver info for user {}, using defaults", request.getReceiverId(), e);
        }

        // Fetch sender info
        try {
            ApiResponse<Map<String, Object>> senderResp = authFeignClient.getUser(senderId);
            if (senderResp != null && senderResp.getData() != null) {
                Map<String, Object> senderData = senderResp.getData();
                message.setSenderName(String.valueOf(senderData.getOrDefault("name", senderData.getOrDefault("username", ""))));
                message.setSenderAvatar(String.valueOf(senderData.getOrDefault("avatarUrl", "")));
            }
        } catch (Exception e) {
            log.warn("Failed to fetch sender info for user {}, using defaults", senderId, e);
        }

        message.setCreatedAt(LocalDateTime.now());
        messageMapper.insert(message);

        // Upsert conversation
        upsertConversation(senderId, request.getReceiverId(), request.getProductId(), request.getContent());

        MessageResponse response = buildMessageResponse(message);

        // Push via WebSocket to receiver
        try {
            String wsMessage = objectMapper.writeValueAsString(Map.of(
                    "type", "NEW_MESSAGE",
                    "data", response
            ));
            sessionManager.sendToUser(request.getReceiverId(), wsMessage);
        } catch (Exception e) {
            log.warn("WebSocket push failed for receiver {}: {}", request.getReceiverId(), e.getMessage());
        }

        return ApiResponse.success(response);
    }

    @Override
    @Transactional
    public ApiResponse<List<MessageResponse>> getMessages(Long productId, Long otherUserId, Long userId,
                                                           Integer page, Integer size) {
        // Mark messages as read
        messageMapper.markRead(productId, userId, otherUserId);

        // Reset conversation unread count
        LambdaUpdateWrapper<Conversation> updateWrapper = new LambdaUpdateWrapper<>();
        Long userA = Math.min(userId, otherUserId);
        Long userB = Math.max(userId, otherUserId);
        updateWrapper.eq(Conversation::getProductId, productId)
                .eq(Conversation::getUserAId, userA)
                .eq(Conversation::getUserBId, userB);
        if (userId.equals(userA)) {
            updateWrapper.set(Conversation::getUserAUnreadCount, 0);
        } else {
            updateWrapper.set(Conversation::getUserBUnreadCount, 0);
        }
        conversationMapper.update(null, updateWrapper);

        // Query messages: include regular chat + system messages for both users
        int offset = (page - 1) * size;
        LambdaQueryWrapper<Message> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.and(w -> w.and(
                        // Regular messages: user1↔user2
                        q -> q.eq(Message::getSenderId, userId)
                                .eq(Message::getReceiverId, otherUserId)
                                .eq(Message::getRelatedId, productId))
                .or(q -> q.eq(Message::getSenderId, otherUserId)
                        .eq(Message::getReceiverId, userId)
                        .eq(Message::getRelatedId, productId))
                // System messages directed to either participant
                .or(q -> q.eq(Message::getSenderId, 0L)
                        .eq(Message::getReceiverId, userId)
                        .eq(Message::getRelatedId, productId)
                        .eq(Message::getMessageType, MessageType.SYSTEM))
                .or(q -> q.eq(Message::getSenderId, 0L)
                        .eq(Message::getReceiverId, otherUserId)
                        .eq(Message::getRelatedId, productId)
                        .eq(Message::getMessageType, MessageType.SYSTEM)))
                .eq(Message::getIsDeletedBySender, 0)
                .eq(Message::getIsDeletedByReceiver, 0)
                .orderByDesc(Message::getCreatedAt)
                .last("LIMIT " + size + " OFFSET " + offset);

        List<Message> messages = messageMapper.selectList(queryWrapper);
        List<MessageResponse> responses = messages.stream()
                .map(this::buildMessageResponse)
                .collect(Collectors.toList());

        return ApiResponse.success(responses);
    }

    @Override
    @Transactional
    public ApiResponse<Void> sendSystemMessage(SystemMessageRequest request) {
        // Send to buyer
        sendSystemMessageToUser(request.getContent(), request.getProductId(),
                request.getBuyerId(), request.getSellerId(), request.getOrderNo());

        // Send to seller
        sendSystemMessageToUser(request.getContent(), request.getProductId(),
                request.getSellerId(), request.getBuyerId(), request.getOrderNo());

        log.info("System message sent for order {}: event={}", request.getOrderNo(), request.getEventType());
        return ApiResponse.success(null);
    }

    private void sendSystemMessageToUser(String content, Long productId,
                                          Long receiverId, Long otherUserId, String orderNo) {
        Message message = new Message();
        message.setSenderId(0L);
        message.setSenderName("系统通知");
        message.setSenderAvatar("");
        message.setReceiverId(receiverId);
        message.setRelatedId(productId);
        message.setRelatedType("PRODUCT");
        message.setMessageType(MessageType.SYSTEM);
        message.setContent(content);
        message.setIsRead(0);
        message.setIsDeletedBySender(0);
        message.setIsDeletedByReceiver(0);
        message.setCreatedAt(LocalDateTime.now());

        messageMapper.insert(message);

        // Use the actual buyer-seller pair for conversation (not system user 0L),
        // so system messages appear in the regular chat and can be marked read.
        // Note: second param = receiverId so unread count increments for the receiver.
        upsertConversation(otherUserId, receiverId, productId, content);

        // Push system message via WebSocket to receiver
        try {
            String wsMessage = objectMapper.writeValueAsString(Map.of(
                    "type", "NEW_MESSAGE",
                    "data", buildMessageResponse(message)
            ));
            sessionManager.sendToUser(receiverId, wsMessage);
        } catch (Exception e) {
            log.warn("WebSocket push failed for system message receiver {}: {}", receiverId, e.getMessage());
        }
    }

    private void upsertConversation(Long userAId, Long userBId, Long productId, String lastContent) {
        Long userA = Math.min(userAId, userBId);
        Long userB = Math.max(userAId, userBId);

        LambdaQueryWrapper<Conversation> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Conversation::getProductId, productId)
                .eq(Conversation::getUserAId, userA)
                .eq(Conversation::getUserBId, userB);

        Conversation conversation = conversationMapper.selectOne(queryWrapper);

        if (conversation != null) {
            conversation.setLastMessageContent(lastContent);
            conversation.setLastMessageAt(LocalDateTime.now());
            conversation.setUpdatedAt(LocalDateTime.now());
            // Increment unread count for the receiver
            if (userAId == 0L) {
                // System message - increment both or just the receiver
                if (userBId.equals(userA)) {
                    conversation.setUserAUnreadCount(conversation.getUserAUnreadCount() + 1);
                } else {
                    conversation.setUserBUnreadCount(conversation.getUserBUnreadCount() + 1);
                }
            } else if (userBId.equals(userB)) {
                conversation.setUserBUnreadCount(conversation.getUserBUnreadCount() + 1);
            } else {
                conversation.setUserAUnreadCount(conversation.getUserAUnreadCount() + 1);
            }
            conversationMapper.updateById(conversation);
        } else {
            conversation = new Conversation();
            conversation.setProductId(productId);
            conversation.setUserAId(userA);
            conversation.setUserBId(userB);
            conversation.setLastMessageContent(lastContent);
            conversation.setLastMessageAt(LocalDateTime.now());
            conversation.setCreatedAt(LocalDateTime.now());
            conversation.setUpdatedAt(LocalDateTime.now());
            // Set initial unread count
            if (userAId == 0L) {
                // System message - mark both or receiver
                if (userBId.equals(userA)) {
                    conversation.setUserAUnreadCount(1);
                    conversation.setUserBUnreadCount(0);
                } else {
                    conversation.setUserAUnreadCount(0);
                    conversation.setUserBUnreadCount(1);
                }
            } else if (userBId.equals(userB)) {
                conversation.setUserAUnreadCount(0);
                conversation.setUserBUnreadCount(1);
            } else {
                conversation.setUserAUnreadCount(1);
                conversation.setUserBUnreadCount(0);
            }
            conversationMapper.insert(conversation);
        }
    }

    private MessageResponse buildMessageResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .senderId(message.getSenderId())
                .senderName(message.getSenderName())
                .senderAvatar(message.getSenderAvatar())
                .receiverId(message.getReceiverId())
                .receiverName(message.getReceiverName())
                .receiverAvatar(message.getReceiverAvatar())
                .relatedId(message.getRelatedId())
                .relatedType(message.getRelatedType())
                .orderId(message.getOrderId())
                .messageType(message.getMessageType() != null ? message.getMessageType().getValue() : "TEXT")
                .content(message.getContent())
                .isRead(message.getIsRead())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
