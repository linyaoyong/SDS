package com.campus.trade.auth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.campus.trade.auth.dto.AddressRequest;
import com.campus.trade.auth.dto.AddressResponse;
import com.campus.trade.auth.entity.Address;
import com.campus.trade.auth.mapper.AddressMapper;
import com.campus.trade.auth.service.AddressService;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AddressServiceImpl implements AddressService {

    private final AddressMapper addressMapper;

    @Override
    public ApiResponse<List<AddressResponse>> listAddresses(Long userId) {
        List<Address> addresses = addressMapper.selectList(
                new LambdaQueryWrapper<Address>()
                        .eq(Address::getUserId, userId)
                        .orderByDesc(Address::getIsDefault)
                        .orderByDesc(Address::getUpdatedAt)
        );

        List<AddressResponse> responses = addresses.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return ApiResponse.success(responses);
    }

    @Override
    public ApiResponse<AddressResponse> getAddress(Long id, Long userId) {
        Address address = addressMapper.selectOne(
                new LambdaQueryWrapper<Address>()
                        .eq(Address::getId, id)
                        .eq(Address::getUserId, userId)
        );

        if (address == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "地址不存在");
        }

        return ApiResponse.success(toResponse(address));
    }

    @Override
    @Transactional
    public ApiResponse<AddressResponse> createAddress(Long userId, AddressRequest request) {
        // If this address is set as default, unset other defaults
        if (Boolean.TRUE.equals(request.getIsDefault())) {
            clearDefaultAddresses(userId);
        }

        Address address = new Address();
        address.setUserId(userId);
        address.setReceiverName(request.getReceiverName());
        address.setReceiverPhone(request.getReceiverPhone());
        address.setProvince(request.getProvince());
        address.setCity(request.getCity());
        address.setDistrict(request.getDistrict());
        address.setDetail(request.getDetail());
        address.setPostalCode(request.getPostalCode());
        address.setIsDefault(Boolean.TRUE.equals(request.getIsDefault()) ? 1 : 0);
        address.setTag(request.getTag());

        addressMapper.insert(address);

        log.info("Address created: userId={}, addressId={}", userId, address.getId());
        return ApiResponse.success(toResponse(address));
    }

    @Override
    @Transactional
    public ApiResponse<AddressResponse> updateAddress(Long id, Long userId, AddressRequest request) {
        Address address = addressMapper.selectOne(
                new LambdaQueryWrapper<Address>()
                        .eq(Address::getId, id)
                        .eq(Address::getUserId, userId)
        );

        if (address == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "地址不存在");
        }

        // If setting as default, unset other defaults
        if (Boolean.TRUE.equals(request.getIsDefault()) && address.getIsDefault() != 1) {
            clearDefaultAddresses(userId);
        }

        address.setReceiverName(request.getReceiverName());
        address.setReceiverPhone(request.getReceiverPhone());
        address.setProvince(request.getProvince());
        address.setCity(request.getCity());
        address.setDistrict(request.getDistrict());
        address.setDetail(request.getDetail());
        address.setPostalCode(request.getPostalCode());
        address.setIsDefault(Boolean.TRUE.equals(request.getIsDefault()) ? 1 : 0);
        address.setTag(request.getTag());

        addressMapper.updateById(address);

        log.info("Address updated: addressId={}", id);
        return ApiResponse.success(toResponse(address));
    }

    @Override
    @Transactional
    public ApiResponse<Void> deleteAddress(Long id, Long userId) {
        Address address = addressMapper.selectOne(
                new LambdaQueryWrapper<Address>()
                        .eq(Address::getId, id)
                        .eq(Address::getUserId, userId)
        );

        if (address == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "地址不存在");
        }

        addressMapper.deleteById(id);

        log.info("Address deleted: addressId={}", id);
        return ApiResponse.success(null);
    }

    private void clearDefaultAddresses(Long userId) {
        // Set all addresses for this user to non-default
        Address updateEntity = new Address();
        updateEntity.setIsDefault(0);
        addressMapper.update(updateEntity,
                new LambdaQueryWrapper<Address>()
                        .eq(Address::getUserId, userId)
                        .eq(Address::getIsDefault, 1)
        );
    }

    private AddressResponse toResponse(Address address) {
        return AddressResponse.builder()
                .id(address.getId())
                .userId(address.getUserId())
                .receiverName(address.getReceiverName())
                .receiverPhone(address.getReceiverPhone())
                .province(address.getProvince())
                .city(address.getCity())
                .district(address.getDistrict())
                .detail(address.getDetail())
                .postalCode(address.getPostalCode())
                .isDefault(address.getIsDefault() != null && address.getIsDefault() == 1)
                .tag(address.getTag())
                .build();
    }
}
