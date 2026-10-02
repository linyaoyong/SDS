package com.campus.trade.product.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.campus.trade.product.dto.*;
import com.campus.trade.product.entity.*;
import com.campus.trade.product.entity.enums.ProductStatus;
import com.campus.trade.product.mapper.*;
import com.campus.trade.product.service.ProductService;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.constant.RedisKey;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.campus.trade.product.config.HotProductConfig;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductMapper productMapper;
    private final CategoryMapper categoryMapper;
    private final FavoriteMapper favoriteMapper;
    private final HotProductConfig hotProductConfig;
    private final StringRedisTemplate redisTemplate;

    private static final Set<String> SORT_WHITELIST = Set.of("createdAt", "price", "viewCount", "soldCount");

    @Override
    public ApiResponse<PageResult<ProductResponse>> listProducts(String keyword, Long categoryId,
            Boolean mine, Integer page, Integer size, String sortBy, Long userId) {
        // Validate sortBy (use Nacos dynamic config for default)
        if (sortBy == null || !SORT_WHITELIST.contains(sortBy)) {
            sortBy = hotProductConfig.getDefaultSort();
        }
        if (size == null || size < 1) size = 20;
        if (size > hotProductConfig.getMaxPageSize()) size = hotProductConfig.getMaxPageSize();
        if (page == null || page < 1) page = 1;

        LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<>();

        // Default: only LISTED products (unless mine)
        if (Boolean.TRUE.equals(mine)) {
            if (userId != null) {
                wrapper.eq(Product::getSellerId, userId);
            } else {
                // 未认证用户请求"我的商品"返回空（防止泄露全部商品）
                wrapper.eq(Product::getSellerId, -1L);
            }
        } else {
            wrapper.eq(Product::getStatus, ProductStatus.LISTED);
        }

        // Keyword search on title and description (MySQL LIKE)
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(Product::getTitle, keyword).or().like(Product::getDescription, keyword));
        }

        // Category filter (include children)
        if (categoryId != null) {
            List<Category> children = categoryMapper.selectChildren(categoryId);
            List<Long> categoryIds = new ArrayList<>();
            categoryIds.add(categoryId);
            if (children != null) {
                children.forEach(c -> categoryIds.add(c.getId()));
            }
            wrapper.in(Product::getCategoryId, categoryIds);
        }

        // Sort
        switch (sortBy) {
            case "price": wrapper.orderByAsc(Product::getPrice); break;
            case "viewCount": wrapper.orderByDesc(Product::getViewCount); break;
            case "soldCount": wrapper.orderByDesc(Product::getSoldCount); break;
            default: wrapper.orderByDesc(Product::getCreatedAt);
        }

        Page<Product> productPage = new Page<>(page, size);
        productPage = productMapper.selectPage(productPage, wrapper);

        // 搜索语义：title / description / tags 三字段 OR 匹配（设计文档 §2.1）。
        // DB 已通过 title LIKE OR description LIKE 完成过滤；tags 为 JSON 列无法直接 LIKE，
        // tag-only 命中是 MVP 已知限制（设计文档 §3.3 #6）。此处不再二次过滤，避免把
        // 已命中 title/description 的记录误删（AND 语义会破坏 OR 搜索）。
        List<Product> filteredRecords = productPage.getRecords();

        List<ProductResponse> responses = filteredRecords.stream()
                .map(p -> toResponse(p, userId))
                .collect(Collectors.toList());

        PageResult<ProductResponse> result = new PageResult<>(
                responses, productPage.getTotal(), page, size);
        return ApiResponse.success(result);
    }

    @Override
    public ApiResponse<ProductResponse> getProduct(Long id, Long userId) {
        Product product = productMapper.selectById(id);
        if (product == null) {
            throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
        }
        // Increment view count in Redis
        String viewKey = String.format(RedisKey.VIEW_COUNT, id);
        redisTemplate.opsForValue().increment(viewKey);
        return ApiResponse.success(toResponse(product, userId));
    }

    @Override
    @Transactional
    public ApiResponse<ProductResponse> createProduct(ProductRequest request, Long userId) {
        // Validate category
        Category category = categoryMapper.selectById(request.getCategoryId());
        if (category == null) {
            throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND, "分类不存在");
        }
        if (category.getStatus() != 1) {
            throw new BusinessException(ErrorCode.CATEGORY_DISABLED, "该分类已禁用请重新选择");
        }

        Product product = new Product();
        product.setTitle(request.getTitle());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setOriginalPrice(request.getOriginalPrice());
        product.setCategoryId(request.getCategoryId());
        product.setSellerId(userId);
        product.setCondition(request.getCondition());
        product.setStockQuantity(request.getStockQuantity());
        product.setLocation(request.getLocation());
        product.setTags(request.getTags());
        product.setStatus(ProductStatus.LISTED);
        product.setLikeCount(0);
        product.setViewCount(0);
        product.setSoldCount(0);
        productMapper.insert(product);
        return ApiResponse.success(toResponse(product, userId));
    }

    @Override
    @Transactional
    public ApiResponse<ProductResponse> updateProduct(Long id, ProductRequest request, Long userId) {
        Product product = productMapper.selectById(id);
        if (product == null) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
        if (!product.getSellerId().equals(userId)) throw new BusinessException(ErrorCode.NO_PERMISSION, "无权操作");

        // 自动处理状态：LISTED -> OFF_SHELF 编辑，编辑完成后恢复 LISTED
        ProductStatus originalStatus = product.getStatus();
        boolean wasListed = originalStatus == ProductStatus.LISTED;
        if (wasListed) {
            product.setStatus(ProductStatus.OFF_SHELF);
            productMapper.updateById(product);
        }

        // 仅 OFF_SHELF/SOLD 的状态跳过（SOLD 不可编辑内容）
        if (originalStatus == ProductStatus.SOLD) {
            throw new BusinessException(ErrorCode.MUST_OFF_SHELF_FIRST, "已售出商品不可编辑");
        }

        product.setTitle(request.getTitle());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setOriginalPrice(request.getOriginalPrice());
        product.setCategoryId(request.getCategoryId());
        product.setCondition(request.getCondition());
        product.setLocation(request.getLocation());
        product.setTags(request.getTags());
        if (request.getStockQuantity() != null) {
            product.setStockQuantity(request.getStockQuantity());
        }

        // 恢复原始状态
        if (wasListed) {
            product.setStatus(ProductStatus.LISTED);
        }
        productMapper.updateById(product);
        return ApiResponse.success(toResponse(product, userId));
    }

    @Override
    @Transactional
    public ApiResponse<Void> offShelf(Long id, Long userId) {
        Product product = productMapper.selectById(id);
        if (product == null) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
        if (!product.getSellerId().equals(userId)) throw new BusinessException(ErrorCode.NO_PERMISSION, "无权操作");
        product.setStatus(ProductStatus.OFF_SHELF);
        productMapper.updateById(product);
        return ApiResponse.success(null);
    }

    @Override
    @Transactional
    public ApiResponse<Void> reList(Long id, Long userId) {
        Product product = productMapper.selectById(id);
        if (product == null) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
        if (!product.getSellerId().equals(userId)) throw new BusinessException(ErrorCode.NO_PERMISSION, "无权操作");
        if (product.getStatus() != ProductStatus.OFF_SHELF) {
            throw new BusinessException(ErrorCode.ONLY_OFF_SHELF_CAN_LIST, "仅下架商品可上架");
        }
        if (product.getStockQuantity() <= 0) {
            throw new BusinessException(ErrorCode.STOCK_ZERO_CANNOT_LIST, "库存为0不可上架");
        }
        product.setStatus(ProductStatus.LISTED);
        productMapper.updateById(product);
        return ApiResponse.success(null);
    }

    @Override
    @Transactional
    public ApiResponse<Void> deleteProduct(Long id, Long userId) {
        Product product = productMapper.selectById(id);
        if (product == null) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
        if (!product.getSellerId().equals(userId)) throw new BusinessException(ErrorCode.NO_PERMISSION, "无权操作");
        productMapper.deleteById(id);
        return ApiResponse.success(null);
    }

    @Override
    @Transactional
    public ApiResponse<Void> addProductImage(Long productId, String imageUrl, Long userId) {
        Product product = productMapper.selectById(productId);
        if (product == null) throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, "商品不存在");
        if (!product.getSellerId().equals(userId)) throw new BusinessException(ErrorCode.NO_PERMISSION, "无权操作");
        
        java.util.List<String> images = product.getImages();
        if (images == null) {
            images = new java.util.ArrayList<>();
        } else {
            images = new java.util.ArrayList<>(images);
        }
        images.add(imageUrl);
        product.setImages(images);
        productMapper.updateById(product);
        return ApiResponse.success(null);
    }

    private int getEffectiveViewCount(Product p) {
        int mysqlCount = p.getViewCount() != null ? p.getViewCount() : 0;
        try {
            String viewKey = String.format(RedisKey.VIEW_COUNT, p.getId());
            String redisVal = redisTemplate.opsForValue().get(viewKey);
            int redisCount = (redisVal != null && !redisVal.isEmpty()) ? Integer.parseInt(redisVal) : 0;
            return mysqlCount + redisCount;
        } catch (Exception e) {
            return mysqlCount;
        }
    }

    private ProductResponse toResponse(Product p, Long userId) {
        boolean isFavorited = false;
        if (userId != null) {
            isFavorited = favoriteMapper.selectCount(
                    new LambdaQueryWrapper<Favorite>()
                            .eq(Favorite::getUserId, userId)
                            .eq(Favorite::getProductId, p.getId())
                            .eq(Favorite::getStatus, 1)) > 0;
        }

        // Count total favorites for this product
        int favoriteCount = Math.toIntExact(favoriteMapper.selectCount(
                new LambdaQueryWrapper<Favorite>()
                        .eq(Favorite::getProductId, p.getId())
                        .eq(Favorite::getStatus, 1)));

        // Lookup category names
        String categoryName = null;
        String parentCategoryName = null;
        if (p.getCategoryId() != null) {
            Category category = categoryMapper.selectById(p.getCategoryId());
            if (category != null) {
                categoryName = category.getName();
                if (category.getParentId() != null) {
                    Category parent = categoryMapper.selectById(category.getParentId());
                    if (parent != null) {
                        parentCategoryName = parent.getName();
                    }
                }
            }
        }

        return ProductResponse.builder()
                .id(p.getId()).title(p.getTitle()).description(p.getDescription())
                .price(p.getPrice()).originalPrice(p.getOriginalPrice())
                .categoryId(p.getCategoryId()).categoryName(categoryName)
                .parentCategoryName(parentCategoryName)
                .sellerId(p.getSellerId())
                .images(p.getImages()).condition(p.getCondition() != null ? p.getCondition().getValue() : null)
                .conditionLabel(p.getCondition() != null ? p.getCondition().getLabel() : null)
                .stockQuantity(p.getStockQuantity()).viewCount(getEffectiveViewCount(p))
                .likeCount(p.getLikeCount()).soldCount(p.getSoldCount())
                .status(p.getStatus() != null ? p.getStatus().getValue() : null)
                .statusLabel(p.getStatus() != null ? p.getStatus().getLabel() : null)
                .location(p.getLocation()).tags(p.getTags())
                .isFavorited(isFavorited).favoriteCount(favoriteCount)
                .createdAt(p.getCreatedAt())
                .build();
    }
}
