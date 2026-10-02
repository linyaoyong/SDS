package com.campus.trade.auth.service;

import com.campus.trade.auth.dto.*;
import com.campus.trade.common.dto.ApiResponse;

public interface AuthService {
    ApiResponse<Void> register(RegisterRequest request);

    ApiResponse<LoginResponse> login(LoginRequest request);

    ApiResponse<LoginResponse> refresh(String refreshToken);
}
