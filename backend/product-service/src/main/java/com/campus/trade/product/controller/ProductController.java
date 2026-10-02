package com.campus.trade.product.controller;

import com.campus.trade.product.config.HotProductConfig;
import com.campus.trade.product.dto.*;
import com.campus.trade.product.service.ProductService;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final com.campus.trade.product.feign.OrderFeignClient orderFeignClient;
    private final HotProductConfig hotProductConfig;

    @Value("${upload.path:./static}")
    private String uploadPath;

    @Value("${local.server.port:${server.port}}")
    private int localServerPort;

    @GetMapping
    public ApiResponse<PageResult<ProductResponse>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false, defaultValue = "false") Boolean mine,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        int effectiveSize = Math.min(Math.max(1, size), hotProductConfig.getMaxPageSize());
        String effectiveSort = (sortBy == null || sortBy.isBlank())
                ? hotProductConfig.getDefaultSort()
                : sortBy;
        log.info("[LoadBalancer] product-service:{} handled GET /api/products?page={}&size={}",
                localServerPort, page, effectiveSize);
        return productService.listProducts(keyword, categoryId, mine, page, effectiveSize, effectiveSort, userId);
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductResponse> get(@PathVariable Long id,
                                            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return productService.getProduct(id, userId);
    }

    @PostMapping
    public ApiResponse<ProductResponse> create(@Valid @RequestBody ProductRequest request,
                                               @RequestHeader("X-User-Id") Long userId) {
        return productService.createProduct(request, userId);
    }

    @PutMapping("/{id}")
    public ApiResponse<ProductResponse> update(@PathVariable Long id,
                                               @Valid @RequestBody ProductRequest request,
                                               @RequestHeader("X-User-Id") Long userId) {
        return productService.updateProduct(id, request, userId);
    }

    @PutMapping("/{id}/off-shelf")
    public ApiResponse<Void> offShelf(@PathVariable Long id,
                                      @RequestHeader("X-User-Id") Long userId) {
        return productService.offShelf(id, userId);
    }

    @PutMapping("/{id}/re-list")
    public ApiResponse<Void> reList(@PathVariable Long id,
                                    @RequestHeader("X-User-Id") Long userId) {
        return productService.reList(id, userId);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id,
                                    @RequestHeader("X-User-Id") Long userId) {
        return productService.deleteProduct(id, userId);
    }

    @GetMapping("/{id}/reviews")
    public ApiResponse<?> getReviews(@PathVariable Long id,
                                     @RequestParam(defaultValue = "1") Integer page,
                                     @RequestParam(defaultValue = "20") Integer size) {
        try {
            return orderFeignClient.getReviewsByProduct(id, page, size);
        } catch (Exception e) {
            log.warn("Failed to fetch reviews for product {}: {}", id, e.getMessage());
            return ApiResponse.success(java.util.Collections.emptyList());
        }
    }

    @PostMapping("/upload/{productId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<String> uploadProductImage(@PathVariable Long productId,
                                                  @RequestParam("file") MultipartFile file,
                                                  @RequestHeader("X-User-Id") Long userId) {
        try {
            validateImage(file, 10 * 1024 * 1024); // Max 10MB

            String filename = "products/" + productId + "_" + System.currentTimeMillis() + ".jpg";
            Path targetPath = Paths.get(uploadPath, filename);
            Files.createDirectories(targetPath.getParent());

            // Use Thumbnails.of(InputStream) directly to avoid ImageIO.read() returning null
            // for certain formats (WebP, some PNG variants)
            Thumbnails.of(file.getInputStream())
                    .size(800, 800)
                    .outputFormat("jpg")
                    .toFile(targetPath.toFile());

            String url = "/static/" + filename;
            log.info("Product image uploaded: productId={}, url={}", productId, url);
            return ApiResponse.success(url);
        } catch (IOException e) {
            log.error("Product image upload failed", e);
            return ApiResponse.error(ErrorCode.FILE_UPLOAD_FAILED, "文件上传失败");
        } catch (IllegalArgumentException e) {
            log.warn("Product image upload validation failed: {}", e.getMessage());
            return ApiResponse.error(ErrorCode.VALIDATION_FAILED, e.getMessage());
        }
    }

    private void validateImage(MultipartFile file, long maxSize) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("文件为空");
        }
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("文件大小超过限制");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("仅支持图片文件");
        }
    }

}
