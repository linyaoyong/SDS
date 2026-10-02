package com.campus.trade.auth.service;

import com.campus.trade.auth.dto.AddressRequest;
import com.campus.trade.auth.dto.AddressResponse;
import com.campus.trade.common.dto.ApiResponse;

import java.util.List;

public interface AddressService {
    ApiResponse<List<AddressResponse>> listAddresses(Long userId);

    ApiResponse<AddressResponse> getAddress(Long id, Long userId);

    ApiResponse<AddressResponse> createAddress(Long userId, AddressRequest request);

    ApiResponse<AddressResponse> updateAddress(Long id, Long userId, AddressRequest request);

    ApiResponse<Void> deleteAddress(Long id, Long userId);
}
