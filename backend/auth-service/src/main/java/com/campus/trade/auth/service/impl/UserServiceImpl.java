package com.campus.trade.auth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.campus.trade.auth.dto.*;
import com.campus.trade.auth.entity.User;
import com.campus.trade.auth.mapper.UserMapper;
import com.campus.trade.auth.service.UserService;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.constant.RedisKey;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final StringRedisTemplate redisTemplate;

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    @Override
    public ApiResponse<UserProfileResponse> getCurrentUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
        }

        return ApiResponse.success(toProfileResponse(user));
    }

    @Override
    @Transactional
    public ApiResponse<Void> updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
        }

        // Check username uniqueness if changing (空字符串视为不更新)
        if (request.getUsername() != null && !request.getUsername().isEmpty()
                && !request.getUsername().equals(user.getUsername())) {
            if (userMapper.selectCount(
                    new LambdaQueryWrapper<User>()
                            .eq(User::getUsername, request.getUsername())
                            .ne(User::getId, userId)) > 0) {
                throw new BusinessException(ErrorCode.USERNAME_EXISTS, "用户名已被注册");
            }
            user.setUsername(request.getUsername());
        }

        // Check phone uniqueness if changing (空字符串视为不更新)
        if (request.getPhone() != null && !request.getPhone().isEmpty()
                && !request.getPhone().equals(user.getPhone())) {
            if (userMapper.selectCount(
                    new LambdaQueryWrapper<User>()
                            .eq(User::getPhone, request.getPhone())
                            .ne(User::getId, userId)) > 0) {
                throw new BusinessException(ErrorCode.PHONE_EXISTS, "手机号已被注册");
            }
            user.setPhone(request.getPhone());
        }

        // 其余字段：空字符串视为不更新，避免清空已有数据
        if (request.getName() != null && !request.getName().isEmpty()) user.setName(request.getName());
        if (request.getSchool() != null && !request.getSchool().isEmpty()) user.setSchool(request.getSchool());
        if (request.getCollege() != null && !request.getCollege().isEmpty()) user.setCollege(request.getCollege());
        if (request.getMajor() != null && !request.getMajor().isEmpty()) user.setMajor(request.getMajor());
        if (request.getGrade() != null && !request.getGrade().isEmpty()) user.setGrade(request.getGrade());
        if (request.getGender() != null) user.setGender(request.getGender());

        userMapper.updateById(user);

        log.info("Profile updated: userId={}", userId);
        return ApiResponse.success(null);
    }

    @Override
    @Transactional
    public ApiResponse<Void> changePassword(Long userId, ChangePasswordRequest request) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
        }

        // Verify old password
        if (!PASSWORD_ENCODER.matches(request.getOldPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.OLD_PASSWORD_WRONG, "旧密码不正确");
        }

        // Update password
        user.setPassword(PASSWORD_ENCODER.encode(request.getNewPassword()));
        userMapper.updateById(user);

        // Invalidate all refresh tokens for this user by deleting Redis keys
        String pattern = String.format("refresh_token:%d:*", userId);
        var keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }

        log.info("Password changed: userId={}", userId);
        return ApiResponse.success(null);
    }

    @Override
    public ApiResponse<UserPublicResponse> getUserById(Long id) {
        User user = userMapper.selectById(id);
        if (user == null) {
            return ApiResponse.success(UserPublicResponse.builder()
                    .deleted(true)
                    .build());
        }

        return ApiResponse.success(toPublicResponse(user));
    }

    @Override
    public ApiResponse<List<UserPublicResponse>> batchGetUsers(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return ApiResponse.success(new ArrayList<>());
        }

        List<User> users = userMapper.selectBatchIds(ids);
        List<UserPublicResponse> responses = users.stream()
                .map(this::toPublicResponse)
                .collect(Collectors.toList());

        return ApiResponse.success(responses);
    }

    private UserProfileResponse toProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .phone(user.getPhone())
                .email(user.getEmail())
                .studentId(user.getStudentId())
                .name(user.getName())
                .school(user.getSchool())
                .college(user.getCollege())
                .major(user.getMajor())
                .grade(user.getGrade())
                .gender(user.getGender())
                .avatarUrl(user.getAvatarUrl())
                .creditScore(user.getCreditScore())
                .build();
    }

    private UserPublicResponse toPublicResponse(User user) {
        return UserPublicResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .avatarUrl(user.getAvatarUrl())
                .school(user.getSchool())
                .creditScore(user.getCreditScore())
                .deleted(false)
                .build();
    }
}
