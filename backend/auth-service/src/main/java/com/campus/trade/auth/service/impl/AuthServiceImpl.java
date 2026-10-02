package com.campus.trade.auth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.campus.trade.auth.dto.*;
import com.campus.trade.auth.entity.User;
import com.campus.trade.auth.entity.enums.UserRole;
import com.campus.trade.auth.entity.enums.UserStatus;
import com.campus.trade.auth.mapper.UserMapper;
import com.campus.trade.auth.service.AuthService;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.constant.RedisKey;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
import com.campus.trade.common.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();
    private static final long REFRESH_TOKEN_TTL_HOURS = 7 * 24; // 7 days

    @Override
    @Transactional
    public ApiResponse<Void> register(RegisterRequest request) {
        // Check username uniqueness
        if (userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getUsername, request.getUsername())) > 0) {
            throw new BusinessException(ErrorCode.USERNAME_EXISTS, "用户名已被注册");
        }

        // Check phone uniqueness
        if (userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getPhone, request.getPhone())) > 0) {
            throw new BusinessException(ErrorCode.PHONE_EXISTS, "手机号已被注册");
        }

        // Check email uniqueness
        if (userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getEmail, request.getEmail())) > 0) {
            throw new BusinessException(ErrorCode.EMAIL_EXISTS, "邮箱已被注册");
        }

        // Check student ID uniqueness
        if (userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getStudentId, request.getStudentId())) > 0) {
            throw new BusinessException(ErrorCode.STUDENT_ID_EXISTS, "学号已被注册");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(PASSWORD_ENCODER.encode(request.getPassword()));
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setStudentId(request.getStudentId());
        user.setName(request.getName());
        user.setRole(UserRole.STUDENT);
        user.setStatus(UserStatus.NORMAL);

        userMapper.insert(user);

        log.info("User registered: userId={}, username={}", user.getId(), user.getUsername());
        return ApiResponse.success(null);
    }

    @Override
    public ApiResponse<LoginResponse> login(LoginRequest request) {
        // Find user by credential (username, phone, email, or studentId)
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>()
                        .eq(User::getUsername, request.getCredential())
                        .or()
                        .eq(User::getPhone, request.getCredential())
                        .or()
                        .eq(User::getEmail, request.getCredential())
                        .or()
                        .eq(User::getStudentId, request.getCredential())
        );

        if (user == null) {
            throw new BusinessException(ErrorCode.LOGIN_FAILED, "账号或密码错误");
        }

        // Check if account is frozen
        if (user.getStatus() == UserStatus.FROZEN) {
            throw new BusinessException(ErrorCode.ACCOUNT_FROZEN, "账号已被冻结");
        }

        // Verify password
        if (!PASSWORD_ENCODER.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.LOGIN_FAILED, "账号或密码错误");
        }

        // Generate tokens
        String accessToken = jwtUtil.generateToken(user.getId(), user.getRole().getValue());
        String refreshToken = UUID.randomUUID().toString().replace("-", "");

        // Store refresh token in Redis
        String redisKey = String.format(RedisKey.REFRESH_TOKEN, user.getId(), refreshToken);
        redisTemplate.opsForValue().set(redisKey, user.getId().toString(), REFRESH_TOKEN_TTL_HOURS, TimeUnit.HOURS);

        log.info("User logged in: userId={}, username={}", user.getId(), user.getUsername());
        return ApiResponse.success(LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .build());
    }

    @Override
    public ApiResponse<LoginResponse> refresh(String refreshToken) {
        // Login issues UUIDs without hyphens. Never accept Redis glob syntax from callers.
        if (refreshToken == null || !refreshToken.matches("[0-9a-f]{32}")) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID, "刷新令牌无效或已过期");
        }
        // Scan Redis keys matching the pattern to find the refresh token
        // The key format is refresh_token:<userId>:<token>
        String pattern = "refresh_token:*:" + refreshToken;
        var keys = redisTemplate.keys(pattern);

        if (keys == null || keys.isEmpty()) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID, "刷新令牌无效或已过期");
        }

        String key = keys.iterator().next();
        String userIdStr = redisTemplate.opsForValue().get(key);
        if (userIdStr == null) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID, "刷新令牌无效或已过期");
        }

        Long userId = Long.parseLong(userIdStr);

        // Delete old refresh token
        redisTemplate.delete(key);

        // Fetch user
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
        }

        if (user.getStatus() == UserStatus.FROZEN) {
            throw new BusinessException(ErrorCode.ACCOUNT_FROZEN, "账号已被冻结");
        }

        // Generate new tokens
        String newAccessToken = jwtUtil.generateToken(user.getId(), user.getRole().getValue());
        String newRefreshToken = UUID.randomUUID().toString().replace("-", "");

        // Store new refresh token
        String newRedisKey = String.format(RedisKey.REFRESH_TOKEN, user.getId(), newRefreshToken);
        redisTemplate.opsForValue().set(newRedisKey, user.getId().toString(), REFRESH_TOKEN_TTL_HOURS, TimeUnit.HOURS);

        log.info("Token refreshed: userId={}", user.getId());
        return ApiResponse.success(LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .userId(user.getId())
                .username(user.getUsername())
                .avatarUrl(user.getAvatarUrl())
                .build());
    }
}
