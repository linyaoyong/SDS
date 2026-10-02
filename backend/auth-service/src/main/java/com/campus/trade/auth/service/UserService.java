package com.campus.trade.auth.service;

import com.campus.trade.auth.dto.*;
import com.campus.trade.common.dto.ApiResponse;

import java.util.List;

public interface UserService {
    ApiResponse<UserProfileResponse> getCurrentUser(Long userId);

    ApiResponse<Void> updateProfile(Long userId, UpdateProfileRequest request);

    ApiResponse<Void> changePassword(Long userId, ChangePasswordRequest request);

    ApiResponse<UserPublicResponse> getUserById(Long id);

    ApiResponse<List<UserPublicResponse>> batchGetUsers(List<Long> ids);
}
