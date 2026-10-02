package com.campus.trade.message.controller;

import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
import com.campus.trade.message.dto.SystemMessageRequest;
import com.campus.trade.message.service.MessageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/internal/messages")
@RequiredArgsConstructor
public class InternalMessageController {

    private final MessageService messageService;

    @Value("${internal.token}")
    private String internalToken;

    private void validateToken(String token) {
        if (!internalToken.equals(token)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "无权访问内部接口");
        }
    }

    @PostMapping("/system")
    public ApiResponse<Void> sendSystemMessage(@RequestBody SystemMessageRequest request,
                                               @RequestHeader("X-Internal-Token") String token) {
        validateToken(token);
        return messageService.sendSystemMessage(request);
    }
}
