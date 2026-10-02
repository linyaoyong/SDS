package com.campus.trade.auth.controller;

import com.campus.trade.auth.dto.AddressRequest;
import com.campus.trade.auth.dto.AddressResponse;
import com.campus.trade.auth.service.AddressService;
import com.campus.trade.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @GetMapping
    public ApiResponse<List<AddressResponse>> listAddresses(@RequestHeader("X-User-Id") Long userId) {
        return addressService.listAddresses(userId);
    }

    @GetMapping("/{id}")
    public ApiResponse<AddressResponse> getAddress(@PathVariable Long id,
                                                   @RequestHeader("X-User-Id") Long userId) {
        return addressService.getAddress(id, userId);
    }

    @PostMapping
    public ApiResponse<AddressResponse> createAddress(@RequestHeader("X-User-Id") Long userId,
                                                      @Valid @RequestBody AddressRequest request) {
        return addressService.createAddress(userId, request);
    }

    @PutMapping("/{id}")
    public ApiResponse<AddressResponse> updateAddress(@PathVariable Long id,
                                                      @RequestHeader("X-User-Id") Long userId,
                                                      @Valid @RequestBody AddressRequest request) {
        return addressService.updateAddress(id, userId, request);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteAddress(@PathVariable Long id,
                                           @RequestHeader("X-User-Id") Long userId) {
        return addressService.deleteAddress(id, userId);
    }
}
