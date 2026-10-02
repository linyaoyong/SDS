package com.campus.trade.auth.controller;

import com.campus.trade.auth.entity.User;
import com.campus.trade.auth.mapper.UserMapper;
import com.campus.trade.common.constant.ErrorCode;
import com.campus.trade.common.dto.ApiResponse;
import com.campus.trade.common.exception.BusinessException;
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
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UserController {

    private final UserMapper userMapper;

    @Value("${upload.path:./static}")
    private String uploadPath;

    @PostMapping("/avatar")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<String> uploadAvatar(@RequestParam("file") MultipartFile file,
                                            @RequestHeader("X-User-Id") Long userId) {
        try {
            validateImage(file, 5 * 1024 * 1024); // Max 5MB

            String filename = "avatars/" + userId + "_" + System.currentTimeMillis() + ".jpg";
            Path targetPath = Paths.get(uploadPath, filename);
            Files.createDirectories(targetPath.getParent());

            // Use Thumbnails.of(InputStream) directly to avoid ImageIO.read() returning null
            Thumbnails.of(file.getInputStream())
                    .size(200, 200)
                    .outputFormat("jpg")
                    .toFile(targetPath.toFile());

            String url = "/static/" + filename;

            // Update user's avatar_url
            User user = userMapper.selectById(userId);
            if (user == null) {
                throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
            }
            user.setAvatarUrl(url);
            userMapper.updateById(user);

            log.info("Avatar uploaded: userId={}, url={}", userId, url);
            return ApiResponse.success(url);
        } catch (IOException e) {
            log.error("Avatar upload failed", e);
            return ApiResponse.error(ErrorCode.FILE_UPLOAD_FAILED, "文件上传失败");
        } catch (IllegalArgumentException e) {
            log.warn("Avatar upload validation failed: {}", e.getMessage());
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
