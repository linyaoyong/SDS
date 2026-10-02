package com.campus.trade.auth.controller;

import com.campus.trade.auth.dto.*;
import com.campus.trade.auth.service.UserService;
import com.campus.trade.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserProfileResponse> getCurrentUser(
            @RequestHeader("X-User-Id") Long userId) {
        return userService.getCurrentUser(userId);
    }

    @PutMapping("/me")
    public ApiResponse<Void> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(userId, request);
    }

    @PutMapping("/me/password")
    public ApiResponse<Void> changePassword(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ChangePasswordRequest request) {
        return userService.changePassword(userId, request);
    }

    @GetMapping("/{id}")
    public ApiResponse<UserPublicResponse> getUserById(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    @GetMapping("/batch")
    public ApiResponse<List<UserPublicResponse>> batchGetUsers(
            @RequestParam("ids") List<Long> ids) {
        return userService.batchGetUsers(ids);
    }
}
