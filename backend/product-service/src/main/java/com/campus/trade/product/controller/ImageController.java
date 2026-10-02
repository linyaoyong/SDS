package com.campus.trade.product.controller;

import com.campus.trade.product.entity.Product;
import com.campus.trade.product.mapper.ProductMapper;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ImageController {

    private final ProductMapper productMapper;

    /**
     * Append an image URL to product images array (no status restriction)
     */
    @PostMapping("/{id}/images")
    @Transactional
    public ApiResponse<Void> addImage(@PathVariable Long id,
                                      @RequestHeader("X-User-Id") Long userId,
                                      @RequestBody Map<String, String> body) {
        Product product = validateOwnership(id, userId);
        String imageUrl = body.get("imageUrl");
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "imageUrl is required");
        }

        List<String> images = product.getImages();
        if (images == null) images = new ArrayList<>();
        if (images.size() >= 9) {
            throw new BusinessException(ErrorCode.IMAGE_COUNT_EXCEEDED, "图片数量不能超过9张");
        }
        images.add(imageUrl);
        product.setImages(images);
        productMapper.updateById(product);
        return ApiResponse.success(null);
    }

    /**
     * Delete image at specified index (no status restriction)
     */
    @DeleteMapping("/{id}/images/{index}")
    @Transactional
    public ApiResponse<Void> deleteImage(@PathVariable Long id,
                                         @PathVariable int index,
                                         @RequestHeader("X-User-Id") Long userId) {
        Product product = validateOwnership(id, userId);
        List<String> images = product.getImages();
        if (images == null || index < 0 || index >= images.size()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "无效的图片索引");
        }
        images.remove(index);
        product.setImages(images);
        productMapper.updateById(product);
        return ApiResponse.success(null);
    }

    /**
     * Reorder images by providing complete new array
     */
    @PutMapping("/{id}/images/sort")
    @Transactional
    public ApiResponse<Void> sortImages(@PathVariable Long id,
                                        @RequestHeader("X-User-Id") Long userId,
                                        @RequestBody Map<String, List<String>> body) {
        Product product = validateOwnership(id, userId);
        List<String> newImages = body.get("images");
        if (newImages == null) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "images is required");
        }
        if (newImages.size() > 9) {
            throw new BusinessException(ErrorCode.IMAGE_COUNT_EXCEEDED, "图片数量不能超过9张");
        }
        product.setImages(newImages);
        productMapper.updateById(product);
        return ApiResponse.success(null);
    }

    private Product validateOwnership(Long productId, Long userId) {
        Product product = productMapper.selectById(productId);
        if (product == null) {
            throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
        }
        if (!product.getSellerId().equals(userId)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "无权操作");
        }
        return product;
    }
}
